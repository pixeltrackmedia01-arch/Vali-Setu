import { Prisma } from "@prisma/client";
import { audit } from "@/lib/audit";
import { db, type Tx } from "@/lib/db";
import type { Language, WorkflowStatus } from "@/lib/domain/constants";
import { approvalEligibility, checkReadiness, isEditable, statusAfterEdit, type EligibilityInput } from "@/lib/domain/workflow";
import { can, noticeScope, type Actor } from "@/lib/permissions";
import { splitList } from "@/lib/utils";
import type { NoticeInput, NoticePatch } from "@/lib/validation/schemas";
import { AppError, ForbiddenError, NotFoundError } from "@/services/errors";
import { getAiProvider, getSpeechProvider, getTranslationProvider } from "@/services/providers";
import { compareTexts, requiresOverride } from "@/services/validation/compare";
import { countDeliverable, planRecipients } from "./recipients";

export const noticeDetailInclude = {
  classes: { include: { classSection: true } },
  translations: { orderBy: { language: "asc" } },
  validations: { orderBy: { createdAt: "asc" } },
  audio: true,
  versions: { orderBy: { version: "desc" } },
  creator: { select: { id: true, name: true } },
  approvedBy: { select: { id: true, name: true } },
  school: { select: { id: true, name: true, helpline: true } },
} satisfies Prisma.NoticeInclude;

export type NoticeDetail = Prisma.NoticeGetPayload<{ include: typeof noticeDetailInclude }>;

/** Load a notice the actor may see, or throw 404 (never 403, to avoid leaking existence). */
export async function getNoticeForActor(actor: Actor, id: string, client: Tx | typeof db = db): Promise<NoticeDetail> {
  const notice = await client.notice.findFirst({ where: { AND: [{ id }, noticeScope(actor)] }, include: noticeDetailInclude });
  if (!notice) throw new NotFoundError("Notice");
  return notice;
}

function requireEditor(actor: Actor) {
  if (!can(actor, "notice.create")) throw new ForbiddenError("Only teachers and head teachers can edit notices.");
}

async function assertClassesInScope(actor: Actor, classSectionIds: string[], client: Tx | typeof db) {
  const where: Prisma.ClassSectionWhereInput = { id: { in: classSectionIds }, schoolId: actor.schoolId ?? "__none__" };
  // Teachers may only address classes they are assigned to.
  if (actor.role === "TEACHER") where.assignments = { some: { userId: actor.id } };
  const count = await client.classSection.count({ where });
  if (count !== new Set(classSectionIds).size) throw new ForbiddenError("You can only send notices to your own classes.");
}

export async function createNotice(actor: Actor, input: NoticeInput) {
  requireEditor(actor);
  if (!actor.schoolId) throw new ForbiddenError();
  return db.$transaction(async (tx) => {
    await assertClassesInScope(actor, input.classSectionIds, tx);
    const notice = await tx.notice.create({
      data: {
        schoolId: actor.schoolId!,
        creatorId: actor.id,
        title: input.title,
        category: input.category,
        sourceText: input.sourceText,
        sourceLanguage: input.sourceLanguage,
        priority: input.priority,
        recipientMode: input.recipientMode,
        selectedGuardianIds: JSON.stringify(input.selectedGuardianIds),
        targetLanguages: input.targetLanguages.join(","),
        channels: input.channels.join(","),
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
        classes: { create: input.classSectionIds.map((classSectionId) => ({ classSectionId })) },
        versions: {
          create: { version: 1, title: input.title, sourceText: input.sourceText, createdById: actor.id },
        },
      },
    });
    await audit({ actorId: actor.id, entityType: "Notice", entityId: notice.id, action: "notice.created", metadata: { version: 1 } }, tx);
    return notice;
  });
}

/**
 * Update a notice. A change to the title, source or simplified text creates a
 * new immutable version, makes translations and audio stale and sends the
 * notice back to draft so it is reviewed again.
 */
export async function updateNotice(actor: Actor, id: string, patch: NoticePatch) {
  requireEditor(actor);
  return db.$transaction(async (tx) => {
    const notice = await getNoticeForActor(actor, id, tx);
    const status = notice.workflowStatus as WorkflowStatus;
    if (!isEditable(status)) throw new AppError("NOT_EDITABLE", "This notice has already been dispatched and can no longer be changed.", 409);
    if (patch.classSectionIds) await assertClassesInScope(actor, patch.classSectionIds, tx);

    const contentChanged =
      (patch.title !== undefined && patch.title !== notice.title) ||
      (patch.sourceText !== undefined && patch.sourceText !== notice.sourceText) ||
      (patch.simplifiedText !== undefined && (patch.simplifiedText ?? null) !== notice.simplifiedText);
    const settingsChanged =
      patch.classSectionIds !== undefined ||
      patch.targetLanguages !== undefined ||
      patch.channels !== undefined ||
      patch.recipientMode !== undefined ||
      patch.selectedGuardianIds !== undefined ||
      patch.priority !== undefined ||
      patch.category !== undefined;

    const nextVersion = contentChanged ? notice.version + 1 : notice.version;
    const resetApproval = (contentChanged || settingsChanged) && status !== "DRAFT";
    const updated = await tx.notice.update({
      where: { id },
      data: {
        title: patch.title,
        category: patch.category,
        sourceText: patch.sourceText,
        sourceLanguage: patch.sourceLanguage,
        simplifiedText: patch.simplifiedText === undefined ? undefined : patch.simplifiedText,
        simplifiedBy: patch.simplifiedText !== undefined && patch.simplifiedText !== notice.simplifiedText ? "manual" : undefined,
        priority: patch.priority,
        recipientMode: patch.recipientMode,
        selectedGuardianIds: patch.selectedGuardianIds ? JSON.stringify(patch.selectedGuardianIds) : undefined,
        targetLanguages: patch.targetLanguages?.join(","),
        channels: patch.channels?.join(","),
        scheduledAt: patch.scheduledAt === undefined ? undefined : patch.scheduledAt ? new Date(patch.scheduledAt) : null,
        version: nextVersion,
        ...(resetApproval ? { workflowStatus: statusAfterEdit(status), approvedById: null, approvedAt: null } : {}),
      },
    });
    if (patch.classSectionIds) {
      await tx.noticeClass.deleteMany({ where: { noticeId: id } });
      await tx.noticeClass.createMany({ data: patch.classSectionIds.map((classSectionId) => ({ noticeId: id, classSectionId })) });
    }
    if (contentChanged) {
      await tx.noticeVersion.create({
        data: {
          noticeId: id,
          version: nextVersion,
          title: updated.title,
          sourceText: updated.sourceText,
          simplifiedText: updated.simplifiedText,
          createdById: actor.id,
        },
      });
      await tx.noticeAudio.updateMany({ where: { noticeId: id }, data: { status: "STALE" } });
    }
    await audit(
      {
        actorId: actor.id,
        entityType: "Notice",
        entityId: id,
        action: resetApproval ? "notice.edited_after_submission" : "notice.updated",
        metadata: { version: nextVersion, contentChanged, approvalReset: resetApproval },
      },
      tx,
    );
    return updated;
  });
}

export async function simplifyNotice(actor: Actor, id: string) {
  requireEditor(actor);
  const notice = await getNoticeForActor(actor, id);
  const ai = await getAiProvider();
  const result = await ai.simplify({ text: notice.sourceText, language: notice.sourceLanguage });
  await updateNotice(actor, id, { simplifiedText: result.text });
  await db.notice.update({ where: { id }, data: { simplifiedBy: result.simulated ? `simulated:${result.note ?? "demo"}` : `live:${result.provider}` } });
  return result;
}

/** Text that translations are produced from: the reviewed simplified version if any. */
export function translationBase(notice: { simplifiedText: string | null; sourceText: string }): string {
  return notice.simplifiedText?.trim() ? notice.simplifiedText : notice.sourceText;
}

async function saveTranslation(
  tx: Tx,
  actor: Actor,
  notice: NoticeDetail,
  language: Language,
  text: string,
  origin: "generated" | "edited" | "reset",
  provider: string,
  model?: string,
) {
  const existing = notice.translations.find((t) => t.language === language);
  const version = (existing?.version ?? 0) + 1;
  const data = {
    translatedText: text,
    provider: origin === "generated" ? provider : existing?.provider ?? provider,
    model: origin === "generated" ? model ?? null : existing?.model ?? null,
    validationStatus: "PENDING",
    reviewState: "OPEN",
    version,
    sourceVersion: notice.version,
    ...(origin === "generated" ? { generatedText: text, editedText: null } : {}),
    ...(origin === "edited" ? { editedText: text } : {}),
    ...(origin === "reset" ? { editedText: null } : {}),
  };
  const translation = existing
    ? await tx.noticeTranslation.update({ where: { id: existing.id }, data })
    : await tx.noticeTranslation.create({ data: { noticeId: notice.id, language, ...data } });
  await tx.translationRevision.create({
    data: { translationId: translation.id, version, text, origin, provider, createdById: actor.id },
  });
  await tx.noticeAudio.updateMany({ where: { translationId: translation.id }, data: { status: "STALE" } });
  const status = notice.workflowStatus as WorkflowStatus;
  if (status !== "DRAFT") {
    await tx.notice.update({ where: { id: notice.id }, data: { workflowStatus: statusAfterEdit(status), approvedById: null, approvedAt: null } });
  }
  await audit(
    {
      actorId: actor.id,
      entityType: "NoticeTranslation",
      entityId: translation.id,
      action: `translation.${origin}`,
      metadata: { noticeId: notice.id, language, version, provider, approvalReset: status !== "DRAFT" },
    },
    tx,
  );
  return translation;
}

export async function generateTranslation(actor: Actor, id: string, language: Language) {
  requireEditor(actor);
  const notice = await getNoticeForActor(actor, id);
  if (!isEditable(notice.workflowStatus as WorkflowStatus)) throw new AppError("NOT_EDITABLE", "Dispatched notices cannot be changed.", 409);
  if (!splitList(notice.targetLanguages).includes(language)) {
    throw new AppError("UNSUPPORTED_LANGUAGE", "This language is not selected for the notice.", 400);
  }
  const provider = await getTranslationProvider();
  // Provider failures throw before anything is written, so saved work is never lost.
  const result = await provider.translate({
    sourceText: translationBase(notice),
    sourceLanguage: notice.sourceLanguage,
    targetLanguage: language,
  });
  if (!result.translatedText.trim()) throw new AppError("INCOMPLETE_TRANSLATION", "The provider returned an empty translation.", 502);
  return db.$transaction((tx) => saveTranslation(tx, actor, notice, language, result.translatedText.trim(), "generated", result.provider, result.model));
}

export async function editTranslation(actor: Actor, id: string, language: Language, text: string) {
  requireEditor(actor);
  const notice = await getNoticeForActor(actor, id);
  if (!isEditable(notice.workflowStatus as WorkflowStatus)) throw new AppError("NOT_EDITABLE", "Dispatched notices cannot be changed.", 409);
  return db.$transaction((tx) => saveTranslation(tx, actor, notice, language, text, "edited", "manual"));
}

export async function resetTranslation(actor: Actor, id: string, language: Language) {
  requireEditor(actor);
  const notice = await getNoticeForActor(actor, id);
  const t = notice.translations.find((x) => x.language === language);
  if (!t?.generatedText) throw new AppError("NOTHING_TO_RESET", "There is no generated version to reset to.", 409);
  return db.$transaction((tx) => saveTranslation(tx, actor, notice, language, t.generatedText!, "reset", t.provider));
}

export async function rejectTranslation(actor: Actor, id: string, language: Language, reason: string) {
  if (!can(actor, "notice.create") && !can(actor, "notice.approve")) throw new ForbiddenError();
  const notice = await getNoticeForActor(actor, id);
  const t = notice.translations.find((x) => x.language === language);
  if (!t) throw new NotFoundError("Translation");
  await db.$transaction(async (tx) => {
    await tx.noticeTranslation.update({ where: { id: t.id }, data: { reviewState: "REJECTED" } });
    await audit({ actorId: actor.id, entityType: "NoticeTranslation", entityId: t.id, action: "translation.rejected", metadata: { language, reason } }, tx);
  });
}

/**
 * Run deterministic critical-detail checks for the simplified text and every
 * translation. A person's earlier review of an identical finding is kept.
 */
export async function validateNotice(actor: Actor, id: string) {
  if (!can(actor, "notice.create") && !can(actor, "notice.approve")) throw new ForbiddenError();
  const notice = await getNoticeForActor(actor, id);
  const referenceYear = (notice.scheduledAt ?? notice.createdAt).getUTCFullYear();
  const targets: { target: string; text: string; translationId: string | null; translationVersion: number | null }[] = [];
  if (notice.simplifiedText?.trim()) {
    targets.push({ target: "simplified", text: notice.simplifiedText, translationId: null, translationVersion: null });
  }
  for (const t of notice.translations) {
    if (!splitList(notice.targetLanguages).includes(t.language)) continue;
    targets.push({ target: t.language, text: t.translatedText, translationId: t.id, translationVersion: t.version });
  }

  const previous = notice.validations;
  const key = (v: { target: string; fieldType: string; sourceValue: string; translatedValue: string | null; status: string }) =>
    [v.target, v.fieldType, v.sourceValue, v.translatedValue ?? "", v.status].join("|");
  const prior = new Map(previous.filter((v) => v.resolution !== "OPEN").map((v) => [key(v), v]));

  return db.$transaction(async (tx) => {
    await tx.noticeValidation.deleteMany({ where: { noticeId: id } });
    let blocking = 0;
    for (const target of targets) {
      const rows = compareTexts(notice.sourceText, target.text, { referenceYear });
      let issues = 0;
      for (const r of rows) {
        const kept = prior.get(key({ target: target.target, ...r }));
        if (r.status !== "MATCHED" && r.critical && !kept) issues += 1;
        await tx.noticeValidation.create({
          data: {
            noticeId: id,
            translationId: target.translationId,
            target: target.target,
            fieldType: r.fieldType,
            sourceValue: r.sourceValue,
            normalizedValue: r.normalizedValue,
            translatedValue: r.translatedValue,
            status: r.status,
            critical: r.critical,
            resolution: kept?.resolution ?? "OPEN",
            reviewNote: kept?.reviewNote ?? r.explanation,
            reviewedById: kept?.reviewedById ?? null,
            reviewedAt: kept?.reviewedAt ?? null,
            noticeVersion: notice.version,
            translationVersion: target.translationVersion,
          },
        });
      }
      if (target.translationId) {
        await tx.noticeTranslation.update({
          where: { id: target.translationId },
          data: { validationStatus: issues > 0 ? "ISSUES" : "PASSED" },
        });
        blocking += issues;
      }
    }
    await audit({ actorId: actor.id, entityType: "Notice", entityId: id, action: "notice.validated", metadata: { version: notice.version, blocking } }, tx);
    return { blocking };
  });
}

/**
 * Resolve a finding. Uncertain findings can be marked reviewed by an editor.
 * Overriding a mismatch or omission needs approval rights and a reason; the
 * better path is to correct the translation and rerun validation.
 */
export async function resolveValidation(actor: Actor, noticeId: string, validationId: string, resolution: "REVIEWED" | "OVERRIDDEN" | "OPEN", note?: string) {
  const notice = await getNoticeForActor(actor, noticeId);
  const v = notice.validations.find((x) => x.id === validationId);
  if (!v) throw new NotFoundError("Validation finding");
  if (!can(actor, "notice.create") && !can(actor, "notice.approve")) throw new ForbiddenError();
  if (resolution === "REVIEWED" && requiresOverride(v.status) && v.critical) {
    throw new AppError("OVERRIDE_REQUIRED", "A mismatch or missing detail must be corrected, or overridden by an approver with a reason.", 409);
  }
  if (resolution === "OVERRIDDEN") {
    if (!can(actor, "notice.override")) throw new ForbiddenError("Only an authorised approver can override a critical discrepancy.");
    if (!note || note.trim().length < 10) throw new AppError("REASON_REQUIRED", "Explain the override in at least 10 characters.", 400);
  }
  await db.$transaction(async (tx) => {
    await tx.noticeValidation.update({
      where: { id: validationId },
      data: {
        resolution,
        reviewNote: note?.trim() || v.reviewNote,
        reviewedById: resolution === "OPEN" ? null : actor.id,
        reviewedAt: resolution === "OPEN" ? null : new Date(),
      },
    });
    await audit(
      {
        actorId: actor.id,
        entityType: "NoticeValidation",
        entityId: validationId,
        action: resolution === "OVERRIDDEN" ? "validation.overridden" : resolution === "REVIEWED" ? "validation.reviewed" : "validation.reopened",
        metadata: { noticeId, target: v.target, fieldType: v.fieldType, status: v.status, note: note?.slice(0, 200) },
      },
      tx,
    );
  });
}

export async function generateAudio(actor: Actor, id: string, language: Language, voice?: string) {
  requireEditor(actor);
  const notice = await getNoticeForActor(actor, id);
  const t = notice.translations.find((x) => x.language === language);
  if (!t) throw new AppError("TRANSLATION_MISSING", "Create the translation before generating audio.", 409);
  const speech = getSpeechProvider();
  let result;
  try {
    result = await speech.synthesize({ text: t.translatedText, language, voice, outputKey: `audio/${notice.id}-${language}-v${t.version}` });
  } catch (error) {
    await db.noticeAudio.upsert({
      where: { translationId: t.id },
      create: { noticeId: id, translationId: t.id, language, provider: speech.id, status: "FAILED", textVersion: t.version, spokenText: t.translatedText, errorMessage: error instanceof AppError ? error.message : "Audio generation failed" },
      update: { status: "FAILED", textVersion: t.version, spokenText: t.translatedText, errorMessage: error instanceof AppError ? error.message : "Audio generation failed" },
    });
    throw error;
  }
  const data = {
    provider: result.provider,
    voice: result.voice ?? voice ?? null,
    audioReference: result.audioReference,
    mimeType: result.mimeType,
    durationSeconds: result.durationSeconds ?? null,
    status: result.status,
    textVersion: t.version,
    spokenText: t.translatedText,
    errorMessage: result.note ?? null,
    generatedAt: new Date(),
  };
  const audio = await db.noticeAudio.upsert({
    where: { translationId: t.id },
    create: { noticeId: id, translationId: t.id, language, ...data },
    update: data,
  });
  await audit({ actorId: actor.id, entityType: "NoticeAudio", entityId: audio.id, action: "audio.generated", metadata: { language, provider: result.provider, status: result.status } });
  return audio;
}

export async function readinessFor(notice: NoticeDetail): Promise<EligibilityInput & { deliverable: number; plannedTotal: number; skipped: number }> {
  const plan = await planRecipients(notice);
  const deliverable = countDeliverable(plan);
  return {
    status: notice.workflowStatus as WorkflowStatus,
    noticeVersion: notice.version,
    sourceText: notice.sourceText,
    targetLanguages: splitList(notice.targetLanguages),
    channels: splitList(notice.channels),
    recipientCount: deliverable,
    translations: notice.translations,
    validations: notice.validations.filter((v) => v.target !== "simplified"),
    audio: notice.audio,
    deliverable,
    plannedTotal: new Set(plan.map((p) => p.guardianId)).size,
    skipped: new Set(plan.filter((p) => p.skipReason).map((p) => p.guardianId)).size,
  };
}

export async function submitNotice(actor: Actor, id: string) {
  requireEditor(actor);
  const notice = await getNoticeForActor(actor, id);
  const status = notice.workflowStatus as WorkflowStatus;
  if (status !== "DRAFT" && status !== "REJECTED") throw new AppError("INVALID_STATE", "Only drafts can be submitted for approval.", 409);
  const readiness = checkReadiness(await readinessFor(notice));
  // Unresolved findings may be submitted so an approver can resolve them, but
  // missing translations or an unrun validation cannot.
  const hard = readiness.reasons.filter((r) => r.code !== "UNRESOLVED_DISCREPANCIES" && r.code !== "AUDIO_MISSING" && r.code !== "AUDIO_STALE");
  if (hard.length) throw new AppError("NOT_READY", "Complete the translations and run validation before submitting.", 409, hard);
  await db.$transaction(async (tx) => {
    await tx.notice.update({ where: { id }, data: { workflowStatus: "PENDING_APPROVAL", rejectionReason: null } });
    await audit({ actorId: actor.id, entityType: "Notice", entityId: id, action: "notice.submitted", metadata: { version: notice.version, warnings: readiness.reasons.length } }, tx);
  });
}

export async function approveNotice(actor: Actor, id: string) {
  if (!can(actor, "notice.approve")) throw new ForbiddenError("You are not authorised to approve notices.");
  const notice = await getNoticeForActor(actor, id);
  if (actor.role === "TEACHER" && notice.creatorId === actor.id) {
    throw new ForbiddenError("A second person must approve notices you created.");
  }
  const eligibility = approvalEligibility(await readinessFor(notice));
  if (!eligibility.ok) throw new AppError("NOT_ELIGIBLE", "This notice cannot be approved yet.", 409, eligibility.reasons);
  await db.$transaction(async (tx) => {
    // Guard against a concurrent edit between the check and the write.
    const updated = await tx.notice.updateMany({
      where: { id, version: notice.version, workflowStatus: "PENDING_APPROVAL" },
      data: { workflowStatus: "APPROVED", approvedById: actor.id, approvedAt: new Date() },
    });
    if (updated.count !== 1) throw new AppError("CONFLICT", "The notice changed while you were reviewing it. Reload and review again.", 409);
    await audit({ actorId: actor.id, entityType: "Notice", entityId: id, action: "notice.approved", metadata: { version: notice.version } }, tx);
  });
}

export async function rejectNotice(actor: Actor, id: string, reason: string) {
  if (!can(actor, "notice.approve")) throw new ForbiddenError("You are not authorised to reject notices.");
  const notice = await getNoticeForActor(actor, id);
  const status = notice.workflowStatus as WorkflowStatus;
  if (!["PENDING_APPROVAL", "APPROVED", "SCHEDULED"].includes(status)) {
    throw new AppError("INVALID_STATE", "Only submitted or approved notices can be rejected.", 409);
  }
  await db.$transaction(async (tx) => {
    await tx.notice.update({ where: { id }, data: { workflowStatus: "REJECTED", rejectionReason: reason, approvedById: null, approvedAt: null } });
    await audit({ actorId: actor.id, entityType: "Notice", entityId: id, action: "notice.rejected", metadata: { version: notice.version, reason } }, tx);
  });
}

export async function scheduleNotice(actor: Actor, id: string, scheduledAt: Date) {
  if (!can(actor, "notice.dispatch")) throw new ForbiddenError();
  const notice = await getNoticeForActor(actor, id);
  if (notice.workflowStatus !== "APPROVED" && notice.workflowStatus !== "SCHEDULED") {
    throw new AppError("INVALID_STATE", "Only approved notices can be scheduled.", 409);
  }
  if (scheduledAt.getTime() < Date.now() + 60_000) throw new AppError("INVALID_TIME", "Choose a time in the future.", 400);
  await db.$transaction(async (tx) => {
    await tx.notice.update({ where: { id }, data: { workflowStatus: "SCHEDULED", scheduledAt } });
    await audit({ actorId: actor.id, entityType: "Notice", entityId: id, action: "notice.scheduled", metadata: { scheduledAt: scheduledAt.toISOString() } }, tx);
  });
}
