"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { api, errorText } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/client";

/** Creates a follow-up task for one family on one notice. */
export function FollowUpButton({ guardianId, noticeId, reason, open }: { guardianId: string; noticeId?: string; reason: string; open: boolean }) {
  const { t } = useI18n();
  const [state, setState] = useState<"idle" | "busy" | "done">(open ? "done" : "idle");
  const [error, setError] = useState<string | null>(null);
  if (state === "done") return <span className="text-xs font-medium text-success-700">{t("school.followUpOpen")}</span>;
  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        loading={state === "busy"}
        onClick={async () => {
          setState("busy");
          setError(null);
          try {
            await api("/api/follow-ups", { body: { guardianId, noticeId, reason } });
            setState("done");
          } catch (err) {
            setError(errorText(err, t));
            setState("idle");
          }
        }}
      >
        {t("school.createFollowUp")}
      </Button>
      {error && <span className="block text-xs text-danger-700" role="alert">{error}</span>}
    </>
  );
}
