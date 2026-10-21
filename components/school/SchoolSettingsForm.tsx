"use client";

import { useState } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { api } from "@/lib/api/client";
import { LANGUAGES, LANGUAGE_NATIVE_NAME, type Language } from "@/lib/domain/constants";
import { useI18n } from "@/lib/i18n/client";
import { useAction } from "@/components/notices/workspace/useAction";

export function SchoolSettingsForm({ helpline, languages, readOnly }: { helpline: string; languages: Language[]; readOnly: boolean }) {
  const { t } = useI18n();
  const { busy, feedback, run } = useAction();
  const [phone, setPhone] = useState(helpline);
  const [langs, setLangs] = useState<Language[]>(languages);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        run("save", () => api("/api/school/settings", { method: "PATCH", body: { helpline: phone, supportedLanguages: langs } }), t("school.saved"));
      }}
    >
      <fieldset disabled={readOnly} className="space-y-4">
        <Field label={t("school.helpline")} htmlFor="helpline">
          <Input id="helpline" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} />
        </Field>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">{t("school.supportedLanguages")}</legend>
          <div className="flex flex-wrap gap-3">
            {LANGUAGES.map((l) => (
              <label key={l} className="flex min-h-11 items-center gap-2 rounded-md border border-line bg-white px-3">
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={langs.includes(l)}
                  onChange={() => setLangs((x) => (x.includes(l) ? x.filter((y) => y !== l) : [...x, l]))}
                />
                {LANGUAGE_NATIVE_NAME[l]}
              </label>
            ))}
          </div>
        </fieldset>
        {!readOnly && (
          <Button type="submit" loading={busy === "save"} disabled={langs.length === 0}>
            {t("common.save")}
          </Button>
        )}
      </fieldset>
      {feedback && <Alert tone={feedback.tone}>{feedback.text}</Alert>}
    </form>
  );
}
