"use client";

import { useState } from "react";
import { Alert, Button, Textarea } from "@/components/ui";
import { api } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/client";
import { useAction } from "@/components/notices/workspace/useAction";

export function QuestionActions({ id, guardianId, noticeId, existingReply }: { id: string; guardianId: string; noticeId: string; existingReply: string | null }) {
  const { t } = useI18n();
  const { busy, feedback, run } = useAction();
  const [reply, setReply] = useState(existingReply ?? "");
  const send = (status: "ANSWERED" | "CLOSED") => run(status, () => api(`/api/responses/${id}`, { method: "PATCH", body: { reply: reply || "—", status } }));
  return (
    <div className="mt-2 space-y-2">
      {feedback && <Alert tone={feedback.tone}>{feedback.text}</Alert>}
      <label htmlFor={`reply-${id}`} className="sr-only">
        {t("responses.reply")}
      </label>
      <Textarea id={`reply-${id}`} rows={2} className="min-h-0" value={reply} onChange={(e) => setReply(e.target.value)} placeholder={t("responses.replyPlaceholder")} maxLength={1000} />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={!reply.trim()} loading={busy === "ANSWERED"} onClick={() => send("ANSWERED")}>
          {t("responses.markAnswered")}
        </Button>
        <Button size="sm" variant="ghost" loading={busy === "CLOSED"} onClick={() => send("CLOSED")}>
          {t("responses.close")}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          loading={busy === "follow"}
          onClick={() => run("follow", () => api("/api/follow-ups", { body: { guardianId, noticeId, reason: t("responses.callback") } }), t("school.followUpCreated"))}
        >
          {t("school.createFollowUp")}
        </Button>
      </div>
    </div>
  );
}
