"use client";

import { useState } from "react";
import { CheckCircle2, Send, XCircle } from "lucide-react";
import { Alert, Button, Card, CardHeader, Input, LinkButton, StatCard } from "@/components/ui";
import { api, newKey } from "@/lib/api/client";
import { LANGUAGE_NATIVE_NAME, isLanguage } from "@/lib/domain/constants";
import { useI18n } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n";
import type { DispatchSummary } from "@/services/notices/dispatch";
import { useAction } from "./useAction";

export interface Reason {
  code: string;
  language?: string;
  count?: number;
}

export interface ReviewProps {
  noticeId: string;
  status: string;
  deliverable: number;
  skipped: number;
  scheduledAt: string | null;
  reasons: Reason[];
  canSubmit: boolean;
  canApprove: boolean;
  approveBlocked: "self" | "role" | null;
  canDispatch: boolean;
  demo: boolean;
  approvedBy: { name: string; date: string } | null;
  rejectionReason: string | null;
  dispatchedAt: string | null;
  summary: DispatchSummary | null;
}

export function ReasonList({ reasons }: { reasons: Reason[] }) {
  const { t } = useI18n();
  return (
    <ul className="list-disc space-y-1 pl-5">
      {reasons.map((r, i) => (
        <li key={i}>
          {t(`wizard.reasons.${r.code}` as MessageKey, {
            language: r.language && isLanguage(r.language) ? LANGUAGE_NATIVE_NAME[r.language] : r.language ?? "",
            count: r.count ?? 0,
          })}
        </li>
      ))}
    </ul>
  );
}

export function ReviewStep(p: ReviewProps) {
  const { t } = useI18n();
  const { busy, feedback, run } = useAction();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [confirmLive, setConfirmLive] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");
  const [idempotencyKey] = useState(newKey);
  const [summary, setSummary] = useState<DispatchSummary | null>(p.summary);

  const pending = p.status === "PENDING_APPROVAL";
  const approved = p.status === "APPROVED" || p.status === "SCHEDULED";
  const ready = p.reasons.length === 0;
  const feedbackDetails = Array.isArray(feedback?.details) ? (feedback.details as Reason[]) : null;

  async function dispatch() {
    const res = await run("dispatch", () => api<{ summary: DispatchSummary }>(`/api/notices/${p.noticeId}/dispatch`, { body: { idempotencyKey, confirmLive } }));
    if (res) {
      setSummary(res.summary);
      setConfirming(false);
    }
  }

  return (
    <div className="space-y-4">
      {p.demo && (p.status === "APPROVED" || p.status === "SCHEDULED" || p.status === "DISPATCHED") && (
        <div className="rounded-md border-2 border-dashed border-warn-600 bg-warn-50 px-4 py-3 text-center font-semibold tracking-wide text-warn-700" role="note">
          {t("wizard.review.demoDispatch")}
        </div>
      )}
      {feedback && (
        <Alert tone={feedback.tone}>
          {feedback.text}
          {feedbackDetails && feedbackDetails.length > 0 && (
            <div className="mt-2">
              <ReasonList reasons={feedbackDetails} />
            </div>
          )}
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label={t("wizard.review.recipients")} value={p.deliverable} hint={t("wizard.review.recipientsDetail", { count: p.deliverable, skipped: p.skipped })} />
        <StatCard
          label={t("wizard.review.schedule")}
          value={<span className="text-base">{p.scheduledAt ?? t("wizard.review.sendNow")}</span>}
        />
        <StatCard label={t("common.status")} value={<span className="text-base">{t(`status.${p.status}` as MessageKey)}</span>} />
      </div>

      {p.rejectionReason && p.status === "REJECTED" && <Alert tone="danger">{t("wizard.review.rejectedReason", { reason: p.rejectionReason })}</Alert>}
      {p.approvedBy && <Alert tone="success">{t("wizard.review.approvedBy", { name: p.approvedBy.name, date: p.approvedBy.date })}</Alert>}

      {p.status !== "DISPATCHED" && (
        <Card>
          <CardHeader title={ready ? t("wizard.review.ready") : t("wizard.review.warnings")} level={3} />
          {ready ? (
            <p className="flex items-center gap-2 text-success-700">
              <CheckCircle2 className="h-5 w-5" aria-hidden /> {t("wizard.review.ready")}
            </p>
          ) : (
            <div className="text-sm text-warn-700">
              <ReasonList reasons={p.reasons} />
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {p.canSubmit && (p.status === "DRAFT" || p.status === "REJECTED") && (
              <Button loading={busy === "submit"} onClick={() => run("submit", () => api(`/api/notices/${p.noticeId}/submit`, { method: "POST" }), t("wizard.review.submitted"))}>
                {t("wizard.review.submit")}
              </Button>
            )}
            {pending && p.canApprove && (
              <Button
                variant="success"
                disabled={!ready}
                loading={busy === "approve"}
                onClick={() => run("approve", () => api(`/api/notices/${p.noticeId}/approve`, { method: "POST" }), t("wizard.review.approved"))}
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                {t("wizard.review.approve")}
              </Button>
            )}
            {(pending || approved) && p.canApprove && (
              <Button variant="secondary" onClick={() => setRejecting((r) => !r)} aria-expanded={rejecting}>
                <XCircle className="h-4 w-4" aria-hidden />
                {t("wizard.review.reject")}
              </Button>
            )}
          </div>
          {pending && p.approveBlocked && (
            <p className="mt-3 text-sm text-ink-muted">{p.approveBlocked === "self" ? t("wizard.review.selfApproval") : t("wizard.review.notAllowedApprove")}</p>
          )}
          {rejecting && (
            <form
              className="mt-3 flex flex-wrap items-end gap-2 rounded-md border border-danger-100 bg-danger-50 p-3"
              onSubmit={async (e) => {
                e.preventDefault();
                if (await run("reject", () => api(`/api/notices/${p.noticeId}/reject`, { body: { reason } }), t("wizard.review.rejected"))) setRejecting(false);
              }}
            >
              <div className="min-w-60 flex-1">
                <label htmlFor="reject-reason" className="mb-1 block text-sm font-medium">
                  {t("wizard.review.rejectReason")}
                </label>
                <Input id="reject-reason" value={reason} onChange={(e) => setReason(e.target.value)} minLength={5} maxLength={500} required />
              </div>
              <Button type="submit" variant="danger" disabled={reason.trim().length < 5} loading={busy === "reject"}>
                {t("wizard.review.reject")}
              </Button>
            </form>
          )}
        </Card>
      )}

      {approved && p.canDispatch && !summary && (
        <Card>
          <CardHeader title={t("wizard.review.dispatch")} level={3} />
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="schedule-at" className="mb-1 block text-sm font-medium">
                {t("wizard.review.scheduleAction")}
              </label>
              <div className="flex gap-2">
                <Input id="schedule-at" type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} className="w-auto" />
                <Button
                  variant="secondary"
                  disabled={!scheduleAt}
                  loading={busy === "schedule"}
                  onClick={() => run("schedule", () => api(`/api/notices/${p.noticeId}/schedule`, { body: { scheduledAt: new Date(scheduleAt).toISOString() } }), t("wizard.review.scheduled"))}
                >
                  {t("common.save")}
                </Button>
              </div>
            </div>
            <Button size="lg" disabled={!ready} onClick={() => setConfirming(true)}>
              <Send className="h-5 w-5" aria-hidden />
              {t("wizard.review.dispatch")}
            </Button>
          </div>
          {confirming && (
            <div role="alertdialog" aria-labelledby="dispatch-confirm" className="mt-4 rounded-md border border-navy-200 bg-navy-50 p-4">
              <p id="dispatch-confirm" className="font-medium">
                {t("wizard.review.dispatchConfirm", { count: p.deliverable })}
              </p>
              {!p.demo && (
                <label className="mt-2 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={confirmLive} onChange={(e) => setConfirmLive(e.target.checked)} className="h-5 w-5" />
                  {t("wizard.review.confirmLive")}
                </label>
              )}
              <div className="mt-3 flex gap-2">
                <Button loading={busy === "dispatch"} disabled={!p.demo && !confirmLive} onClick={dispatch}>
                  {busy === "dispatch" ? t("wizard.review.dispatching") : t("common.yes")}
                </Button>
                <Button variant="ghost" onClick={() => setConfirming(false)}>
                  {t("common.cancel")}
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {summary && <DispatchSummaryCard summary={summary} />}
      {p.dispatchedAt && <Alert tone="success">{t("wizard.review.dispatched", { date: p.dispatchedAt })}</Alert>}
      <div className="flex flex-wrap gap-2">
        <LinkButton variant="secondary" href={`/notices/${p.noticeId}/record`}>
          {t("wizard.review.viewRecord")}
        </LinkButton>
        <LinkButton variant="secondary" href={`/notices/${p.noticeId}/basic-phone`}>
          {t("wizard.review.basicPhone")}
        </LinkButton>
      </div>
    </div>
  );
}

export function DispatchSummaryCard({ summary }: { summary: DispatchSummary }) {
  const { t } = useI18n();
  const demo = summary.mode === "demo";
  return (
    <Card>
      <CardHeader title={t("wizard.summary.title")} level={3} />
      {summary.duplicate && <Alert tone="info" className="mb-3">{t("wizard.summary.duplicate")}</Alert>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label={t("wizard.summary.total")} value={summary.totalRecipients} />
        <StatCard label={t("wizard.summary.queued")} value={summary.queued} />
        <StatCard label={demo ? t("wizard.summary.delivered") : t("wizard.summary.deliveredLive")} value={summary.delivered} tone="success" />
        <StatCard label={demo ? t("wizard.summary.failed") : t("wizard.summary.failedLive")} value={summary.failed} tone={summary.failed ? "danger" : "neutral"} />
        <StatCard label={t("wizard.summary.skipped")} value={summary.skipped} tone={summary.skipped ? "warn" : "neutral"} />
        <StatCard label={t("wizard.summary.followUp")} value={summary.followUpRequired} tone={summary.followUpRequired ? "warn" : "neutral"} />
      </div>
      <p className="mt-3 text-sm text-ink-muted">
        {t("wizard.summary.byLanguage")}:{" "}
        {Object.entries(summary.byLanguage)
          .map(([lang, n]) => `${isLanguage(lang) ? LANGUAGE_NATIVE_NAME[lang] : lang} ${n}`)
          .join(" · ")}
      </p>
    </Card>
  );
}
