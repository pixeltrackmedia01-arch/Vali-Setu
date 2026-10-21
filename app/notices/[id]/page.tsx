import { notFound } from "next/navigation";
import { NoticeForm } from "@/components/notices/NoticeForm";
import { StatusBadge } from "@/components/notices/StatusBadge";
import { AudioStep, type AudioItem } from "@/components/notices/workspace/AudioStep";
import { ReviewStep } from "@/components/notices/workspace/ReviewStep";
import { SimplifyStep } from "@/components/notices/workspace/SimplifyStep";
import { isStep, Stepper, type Step } from "@/components/notices/workspace/Stepper";
import { TranslateStep } from "@/components/notices/workspace/TranslateStep";
import { ValidationPanel, type ValidationGroup } from "@/components/notices/workspace/ValidationPanel";
import { Alert, Badge, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { isLanguage, type Channel, type Language, type NoticeCategory, type Priority, type WorkflowStatus } from "@/lib/domain/constants";
import { checkReadiness, isEditable } from "@/lib/domain/workflow";
import { env, isDemoMode } from "@/lib/env";
import { getT } from "@/lib/i18n/server";
import { can } from "@/lib/permissions";
import { formatDate, safeJson, splitList } from "@/lib/utils";
import { classOptionsFor } from "@/services/notices/class-options";
import type { DispatchSummary } from "@/services/notices/dispatch";
import { readinessFor, translationBase } from "@/services/notices";
import { loadNoticeOr404 } from "@/services/notices/load";

export const metadata = { title: "Notice workspace" };

export default async function NoticeWorkspace({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser(["TEACHER", "HEAD_TEACHER", "SCHOOL_ADMIN"]);
  const { t, locale } = await getT();
  const { id } = await params;
  const q = await searchParams;
  const notice = await loadNoticeOr404(user, id);
  if (!notice) notFound();

  const status = notice.workflowStatus as WorkflowStatus;
  const canEdit = can(user, "notice.create") && isEditable(status);
  const languages = splitList(notice.targetLanguages).filter(isLanguage);
  const channels = splitList(notice.channels) as Channel[];
  const readinessInput = await readinessFor(notice);
  const readiness = checkReadiness(readinessInput);
  const defaultStep: Step = status === "DRAFT" ? (notice.translations.length ? "translate" : "simplify") : "review";
  const step: Step = isStep(q.step) ? q.step : defaultStep;

  const translationView = (lang: Language) => notice.translations.find((x) => x.language === lang);
  const validationsFor = (target: string) => notice.validations.filter((v) => v.target === target);
  const groups: ValidationGroup[] = [...(notice.simplifiedText ? ["simplified"] : []), ...languages].map((target) => {
    const rows = validationsFor(target);
    const tr = isLanguage(target) ? translationView(target) : undefined;
    const current = rows.length > 0 && rows.every((r) => r.noticeVersion === notice.version && (target === "simplified" || r.translationVersion === tr?.version));
    return {
      target,
      current,
      rows: rows.map((r) => ({
        id: r.id,
        fieldType: r.fieldType,
        sourceValue: r.sourceValue,
        translatedValue: r.translatedValue,
        status: r.status,
        critical: r.critical,
        resolution: r.resolution,
        reviewNote: r.reviewNote,
      })),
    };
  });

  const done: Partial<Record<Step, boolean>> = {
    create: true,
    simplify: Boolean(notice.simplifiedText),
    translate: languages.every((l) => translationView(l) && (translationView(l)!.sourceVersion >= notice.version)),
    validate: !readiness.reasons.some((r) => r.code === "VALIDATION_NOT_RUN" || r.code === "UNRESOLVED_DISCREPANCIES" || r.code.startsWith("TRANSLATION")),
    audio: languages.every((l) => notice.audio.some((a) => a.language === l && a.status !== "STALE" && a.status !== "FAILED")),
    review: status === "DISPATCHED",
  };

  return (
    <>
      <PageHeader
        title={notice.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={status} label={t(`status.${status}`)} />
            <Badge>{t("record.version", { version: notice.version })}</Badge>
            {notice.priority !== "NORMAL" && <StatusBadge status={notice.priority} label={t(`priority.${notice.priority as Priority}`)} />}
            <span className="text-sm">
              {notice.classes.map((c) => `${c.classSection.grade}${c.classSection.section}`).join(", ")} · {notice.creator.name} · {formatDate(notice.createdAt, locale)}
            </span>
          </span>
        }
      />
      {!isEditable(status) && <Alert tone="info" className="mb-4">{t("errors.codes.NOT_EDITABLE")}</Alert>}
      {status === "REJECTED" && notice.rejectionReason && step !== "review" && (
        <Alert tone="danger" className="mb-4">{t("wizard.review.rejectedReason", { reason: notice.rejectionReason })}</Alert>
      )}
      {q.saved && step === "create" && <Alert tone="success" className="mb-4">{t("wizard.saved")}</Alert>}
      <Stepper noticeId={notice.id} current={step} done={done} t={t} />

      {step === "create" && (
        <NoticeForm
          classes={await classOptionsFor(user)}
          noticeId={notice.id}
          attachmentName={notice.attachmentName}
          maxUploadMb={Math.round(env().UPLOAD_MAX_BYTES / (1024 * 1024))}
          readOnly={!canEdit}
          initial={{
            title: notice.title,
            category: notice.category as NoticeCategory,
            sourceText: notice.sourceText,
            priority: notice.priority as Priority,
            classSectionIds: notice.classes.map((c) => c.classSectionId),
            recipientMode: notice.recipientMode as "CLASS" | "SELECTED",
            selectedGuardianIds: safeJson<string[]>(notice.selectedGuardianIds, []),
            targetLanguages: languages,
            channels,
            scheduledAt: notice.scheduledAt ? toLocalInput(notice.scheduledAt) : "",
          }}
        />
      )}

      {step === "simplify" && (
        <SimplifyStep noticeId={notice.id} sourceText={notice.sourceText} simplifiedText={notice.simplifiedText} simplifiedBy={notice.simplifiedBy} editable={canEdit} />
      )}

      {step === "translate" && (
        <TranslateStep
          noticeId={notice.id}
          languages={languages}
          base={translationBase(notice)}
          baseIsSimplified={Boolean(notice.simplifiedText?.trim())}
          editable={canEdit}
          canReject={can(user, "notice.create") || can(user, "notice.approve")}
          initialLanguage={isLanguage(q.lang) ? q.lang : undefined}
          translations={languages.flatMap((lang) => {
            const tr = translationView(lang);
            return tr
              ? [
                  {
                    language: lang,
                    translatedText: tr.translatedText,
                    generatedText: tr.generatedText,
                    editedText: tr.editedText,
                    provider: tr.provider,
                    version: tr.version,
                    stale: tr.sourceVersion < notice.version,
                    rejected: tr.reviewState === "REJECTED",
                    validationStatus: tr.validationStatus,
                  },
                ]
              : [];
          })}
        />
      )}

      {step === "validate" && (
        <ValidationPanel
          noticeId={notice.id}
          groups={groups}
          canRun={isEditable(status) && (can(user, "notice.create") || can(user, "notice.approve"))}
          canReview={isEditable(status) && (can(user, "notice.create") || can(user, "notice.approve"))}
          canOverride={isEditable(status) && can(user, "notice.override")}
        />
      )}

      {step === "audio" && (
        <AudioStep
          noticeId={notice.id}
          voiceRequired={channels.includes("voice")}
          editable={canEdit}
          items={languages.map((lang): AudioItem => {
            const tr = translationView(lang);
            const a = notice.audio.find((x) => x.language === lang);
            return {
              language: lang,
              hasTranslation: Boolean(tr),
              text: tr?.translatedText ?? "",
              audio: a
                ? {
                    id: a.id,
                    status: a.status,
                    provider: a.provider,
                    durationSeconds: a.durationSeconds,
                    stale: a.status === "STALE" || a.textVersion !== tr?.version,
                    spokenText: a.spokenText,
                  }
                : null,
            };
          })}
        />
      )}

      {step === "review" && (
        <ReviewStep
          noticeId={notice.id}
          status={status}
          deliverable={readinessInput.deliverable}
          skipped={readinessInput.skipped}
          scheduledAt={notice.scheduledAt ? formatDate(notice.scheduledAt, locale, true) : null}
          reasons={readiness.reasons}
          canSubmit={canEdit}
          canApprove={can(user, "notice.approve") && !(user.role === "TEACHER" && notice.creatorId === user.id)}
          approveBlocked={
            can(user, "notice.approve") ? (user.role === "TEACHER" && notice.creatorId === user.id ? "self" : null) : "role"
          }
          canDispatch={can(user, "notice.dispatch")}
          demo={isDemoMode()}
          approvedBy={notice.approvedBy && notice.approvedAt ? { name: notice.approvedBy.name, date: formatDate(notice.approvedAt, locale, true) } : null}
          rejectionReason={notice.rejectionReason}
          dispatchedAt={notice.dispatchedAt ? formatDate(notice.dispatchedAt, locale, true) : null}
          summary={await storedSummary(notice.id)}
        />
      )}
    </>
  );
}

async function storedSummary(noticeId: string): Promise<DispatchSummary | null> {
  const request = await db.dispatchRequest.findUnique({ where: { noticeId } });
  if (!request) return null;
  const summary = safeJson<Partial<DispatchSummary>>(request.summaryJson, {});
  return summary.dispatchId ? { ...(summary as DispatchSummary), duplicate: false } : null;
}

/** Value for <input type="datetime-local"> in IST. */
function toLocalInput(date: Date): string {
  const ist = new Date(date.getTime() + 5.5 * 3600 * 1000);
  return ist.toISOString().slice(0, 16);
}
