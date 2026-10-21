import { Prisma } from "@prisma/client";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { isLanguage, type Language, type QuestionCategory } from "@/lib/domain/constants";
import type { Actor } from "@/lib/permissions";
import { safeJson, splitList } from "@/lib/utils";
import { AppError, ForbiddenError, NotFoundError } from "@/services/errors";
import { extractCriticalDetails } from "@/services/validation/extract";

function requireGuardian(actor: Actor): string {
  if (actor.role !== "PARENT" || !actor.guardianId) throw new ForbiddenError();
  return actor.guardianId;
}

/** Messages addressed to this guardian. Only dispatched notices with a recipient row are visible. */
export async function listParentMessages(actor: Actor) {
  const guardianId = requireGuardian(actor);
  const rows = await db.noticeRecipient.findMany({
    where: { guardianId, notice: { workflowStatus: "DISPATCHED" }, deliveryStatus: { not: "SKIPPED" } },
    include: {
      notice: {
        select: {
          id: true,
          title: true,
          category: true,
          priority: true,
          dispatchedAt: true,
          school: { select: { name: true, nameGu: true } },
          translations: { select: { language: true, translatedText: true } },
        },
      },
    },
    orderBy: { notice: { dispatchedAt: "desc" } },
  });
  const responses = await db.parentResponse.findMany({ where: { guardianId }, select: { noticeId: true, responseType: true } });
  const seen = new Set<string>();
  return rows
    .filter((r) => (seen.has(r.noticeId) ? false : (seen.add(r.noticeId), true)))
    .map((r) => ({
      noticeId: r.notice.id,
      title: r.notice.title,
      category: r.notice.category,
      priority: r.notice.priority,
      dispatchedAt: r.notice.dispatchedAt,
      schoolName: r.notice.school.name,
      preview: (r.notice.translations.find((t) => t.language === r.language) ?? r.notice.translations[0])?.translatedText.slice(0, 140) ?? "",
      language: r.language,
      read: Boolean(r.readAt),
      acknowledged: responses.some((x) => x.noticeId === r.noticeId && x.responseType === "ACKNOWLEDGED"),
      questionAsked: responses.some((x) => x.noticeId === r.noticeId && x.responseType === "QUESTION"),
    }));
}

async function recipientFor(guardianId: string, noticeId: string) {
  const recipient = await db.noticeRecipient.findFirst({
    where: { guardianId, noticeId, notice: { workflowStatus: "DISPATCHED" }, deliveryStatus: { not: "SKIPPED" } },
    orderBy: { deliveredAt: "desc" },
  });
  if (!recipient) throw new NotFoundError("Message");
  return recipient;
}

/** One message with every approved language version. Opening it records a read event. */
export async function getParentMessage(actor: Actor, noticeId: string) {
  const guardianId = requireGuardian(actor);
  const recipient = await recipientFor(guardianId, noticeId);
  const notice = await db.notice.findUniqueOrThrow({
    where: { id: noticeId },
    select: {
      id: true,
      title: true,
      category: true,
      priority: true,
      dispatchedAt: true,
      targetLanguages: true,
      scheduledAt: true,
      createdAt: true,
      school: { select: { name: true, nameGu: true, helpline: true } },
      translations: { select: { id: true, language: true, translatedText: true } },
      audio: { select: { id: true, language: true, status: true, durationSeconds: true, provider: true, mimeType: true } },
    },
  });
  if (!recipient.readAt) {
    await db.noticeRecipient.updateMany({ where: { noticeId, guardianId, readAt: null }, data: { readAt: new Date() } });
  }
  const responses = await db.parentResponse.findMany({ where: { guardianId, noticeId }, orderBy: { createdAt: "asc" } });
  const languages = splitList(notice.targetLanguages).filter(isLanguage);
  const referenceYear = (notice.dispatchedAt ?? notice.createdAt).getUTCFullYear();
  return {
    notice,
    languages,
    defaultLanguage: recipient.language as Language,
    versions: notice.translations
      .filter((t) => languages.includes(t.language as Language))
      .map((t) => {
        const audio = notice.audio.find((a) => a.language === t.language);
        const details = extractCriticalDetails(t.translatedText, { referenceYear });
        return {
          language: t.language as Language,
          text: t.translatedText,
          audio: audio && (audio.status === "READY" || audio.status === "SIMULATED") ? audio : null,
          keyDetails: details
            .filter((d) => ["date", "deadline", "time", "amount", "document", "phone"].includes(d.type))
            .map((d) => ({ type: d.type, text: d.raw })),
        };
      }),
    acknowledged: responses.some((r) => r.responseType === "ACKNOWLEDGED"),
    questions: responses.filter((r) => r.responseType === "QUESTION"),
  };
}

export async function acknowledgeMessage(actor: Actor, noticeId: string, clientKey: string) {
  const guardianId = requireGuardian(actor);
  const recipient = await recipientFor(guardianId, noticeId);
  const existing = await db.parentResponse.findFirst({ where: { guardianId, noticeId, responseType: "ACKNOWLEDGED" } });
  if (existing) return { response: existing, duplicate: true };
  const notice = await db.notice.findUniqueOrThrow({ where: { id: noticeId }, select: { schoolId: true } });
  try {
    const response = await db.parentResponse.create({
      data: { noticeId, guardianId, schoolId: notice.schoolId, responseType: "ACKNOWLEDGED", status: "RECORDED", clientKey },
    });
    await db.noticeRecipient.updateMany({ where: { noticeId, guardianId }, data: { acknowledgedAt: new Date(), readAt: recipient.readAt ?? new Date() } });
    await audit({ actorId: actor.id, entityType: "ParentResponse", entityId: response.id, action: "parent.acknowledged", metadata: { noticeId } });
    return { response, duplicate: false };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const response = await db.parentResponse.findFirstOrThrow({ where: { guardianId, clientKey } });
      return { response, duplicate: true };
    }
    throw error;
  }
}

export async function askQuestion(
  actor: Actor,
  noticeId: string,
  input: { category: QuestionCategory; message: string; callbackRequested: boolean; clientKey: string },
) {
  const guardianId = requireGuardian(actor);
  await recipientFor(guardianId, noticeId);
  const same = await db.parentResponse.findUnique({ where: { guardianId_clientKey: { guardianId, clientKey: input.clientKey } } });
  if (same) {
    if (same.noticeId !== noticeId) throw new AppError("IDEMPOTENCY_CONFLICT", "Please try again.", 409);
    return { response: same, duplicate: true };
  }
  const open = await db.parentResponse.count({ where: { guardianId, noticeId, responseType: "QUESTION", status: "OPEN" } });
  if (open >= 5) throw new AppError("TOO_MANY_QUESTIONS", "You already have several open questions. The school will contact you.", 429);
  const notice = await db.notice.findUniqueOrThrow({ where: { id: noticeId }, select: { schoolId: true } });
  const response = await db.parentResponse.create({
    data: {
      noticeId,
      guardianId,
      schoolId: notice.schoolId,
      responseType: "QUESTION",
      questionCategory: input.category,
      message: input.message || null,
      callbackRequested: input.callbackRequested,
      status: "OPEN",
      clientKey: input.clientKey,
    },
  });
  await audit({ actorId: actor.id, entityType: "ParentResponse", entityId: response.id, action: "parent.question", metadata: { noticeId, category: input.category } });
  return { response, duplicate: false };
}

export async function recordAudioPlay(actor: Actor, noticeId: string) {
  const guardianId = requireGuardian(actor);
  await recipientFor(guardianId, noticeId);
  await db.noticeRecipient.updateMany({ where: { noticeId, guardianId, audioPlayedAt: null }, data: { audioPlayedAt: new Date() } });
}

export async function getParentProfile(actor: Actor) {
  const guardianId = requireGuardian(actor);
  const guardian = await db.parentGuardian.findUniqueOrThrow({
    where: { id: guardianId },
    include: {
      students: {
        where: { authStatus: "AUTHORIZED" },
        include: { student: { include: { classSection: true, school: { select: { name: true, nameGu: true, helpline: true } } } } },
      },
    },
  });
  return { ...guardian, prefs: safeJson<{ urgentOnly?: boolean; voice?: boolean }>(guardian.notificationPrefs, {}) };
}

export async function updateParentPreferences(
  actor: Actor,
  input: { preferredLanguage?: Language; preferredChannel?: string; urgentOnly?: boolean; voice?: boolean; contactCorrectionNote?: string },
) {
  const guardianId = requireGuardian(actor);
  const current = await db.parentGuardian.findUniqueOrThrow({ where: { id: guardianId } });
  const prefs = { ...safeJson<Record<string, unknown>>(current.notificationPrefs, {}) };
  if (input.urgentOnly !== undefined) prefs.urgentOnly = input.urgentOnly;
  if (input.voice !== undefined) prefs.voice = input.voice;
  await db.$transaction(async (tx) => {
    await tx.parentGuardian.update({
      where: { id: guardianId },
      data: {
        preferredLanguage: input.preferredLanguage,
        preferredChannel: input.preferredChannel,
        notificationPrefs: JSON.stringify(prefs),
        contactCorrectionNote: input.contactCorrectionNote || undefined,
      },
    });
    if (input.preferredLanguage) await tx.user.update({ where: { id: actor.id }, data: { locale: input.preferredLanguage } });
    await audit(
      {
        actorId: actor.id,
        entityType: "ParentGuardian",
        entityId: guardianId,
        action: "parent.preferences_updated",
        metadata: { language: input.preferredLanguage, channel: input.preferredChannel, contactCorrection: Boolean(input.contactCorrectionNote) },
      },
      tx,
    );
  });
}
