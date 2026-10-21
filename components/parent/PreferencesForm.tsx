"use client";

import { useState } from "react";
import { Alert, Button, Textarea } from "@/components/ui";
import { api } from "@/lib/api/client";
import { CHANNELS, LANGUAGES, LANGUAGE_LOCALE, LANGUAGE_NATIVE_NAME, type Channel, type Language } from "@/lib/domain/constants";
import { useI18n } from "@/lib/i18n/client";
import { useAction } from "@/components/notices/workspace/useAction";

export function PreferencesForm({ initial }: { initial: { language: Language; channel: Channel; urgentOnly: boolean; voice: boolean; correction: string } }) {
  const { t } = useI18n();
  const { busy, feedback, run } = useAction();
  const [v, setV] = useState(initial);
  const radio = "flex min-h-12 items-center gap-3 rounded-md border border-line bg-white px-3";
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        run(
          "save",
          () =>
            api("/api/parent/preferences", {
              method: "PATCH",
              body: { preferredLanguage: v.language, preferredChannel: v.channel, urgentOnly: v.urgentOnly, voice: v.voice, ...(v.correction.trim() ? { contactCorrectionNote: v.correction } : {}) },
            }),
          t("parent.saved"),
        );
      }}
    >
      <fieldset>
        <legend className="mb-2 font-medium">{t("parent.prefLanguage")}</legend>
        <div className="space-y-2">
          {LANGUAGES.map((l) => (
            <label key={l} className={radio}>
              <input type="radio" name="language" className="h-5 w-5" checked={v.language === l} onChange={() => setV({ ...v, language: l })} />
              <span lang={LANGUAGE_LOCALE[l]}>{LANGUAGE_NATIVE_NAME[l]}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 font-medium">{t("parent.prefChannel")}</legend>
        <div className="space-y-2">
          {CHANNELS.map((c) => (
            <label key={c} className={radio}>
              <input type="radio" name="channel" className="h-5 w-5" checked={v.channel === c} onChange={() => setV({ ...v, channel: c })} />
              {t(`channel.${c}`)}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="space-y-2">
        <label className={radio}>
          <input type="checkbox" className="h-5 w-5" checked={v.voice} onChange={(e) => setV({ ...v, voice: e.target.checked })} />
          {t("parent.voicePref")}
        </label>
        <label className={radio}>
          <input type="checkbox" className="h-5 w-5" checked={v.urgentOnly} onChange={(e) => setV({ ...v, urgentOnly: e.target.checked })} />
          {t("parent.urgentOnly")}
        </label>
      </div>
      <div>
        <label htmlFor="correction" className="font-medium">
          {t("parent.contactWrong")}
        </label>
        <p className="mb-2 text-sm text-ink-muted">{t("parent.contactWrongHelp")}</p>
        <Textarea id="correction" rows={2} className="min-h-0" value={v.correction} maxLength={300} onChange={(e) => setV({ ...v, correction: e.target.value })} />
      </div>
      {feedback && <Alert tone={feedback.tone}>{feedback.text}</Alert>}
      <Button type="submit" size="lg" className="w-full" loading={busy === "save"}>
        {t("common.save")}
      </Button>
    </form>
  );
}
