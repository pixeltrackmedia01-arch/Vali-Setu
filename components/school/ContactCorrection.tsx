"use client";

import { useState } from "react";
import { Alert, Button, Input } from "@/components/ui";
import { api } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/client";
import { useAction } from "@/components/notices/workspace/useAction";

export function ContactCorrection({ guardianId }: { guardianId: string }) {
  const { t } = useI18n();
  const { busy, feedback, run } = useAction();
  const [phone, setPhone] = useState("");
  return (
    <form
      className="mt-3 flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        run("save", () => api(`/api/families/${guardianId}/contact`, { method: "PATCH", body: { phone: phone.trim() } }), t("school.saved"));
      }}
    >
      <div className="min-w-52 flex-1">
        <label htmlFor="new-phone" className="mb-1 block text-sm font-medium">
          {t("school.phone")}
        </label>
        <Input id="new-phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 90000 00000" />
      </div>
      <Button type="submit" loading={busy === "save"} disabled={phone.trim().length < 10}>
        {t("common.save")}
      </Button>
      {feedback && <Alert tone={feedback.tone} className="w-full">{feedback.text}</Alert>}
    </form>
  );
}
