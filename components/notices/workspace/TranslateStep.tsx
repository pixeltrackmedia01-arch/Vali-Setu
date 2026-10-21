"use client";

import { useState } from "react";
import { Languages } from "lucide-react";
import { Alert, Badge, Button, Card, Input, LinkButton, Textarea } from "@/components/ui";
import { api } from "@/lib/api/client";
import { LANGUAGE_LOCALE, LANGUAGE_NATIVE_NAME, type Language } from "@/lib/domain/constants";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { useAction } from "./useAction";

export interface TranslationView {
  language: Language;
  translatedText: string;
  generatedText: string | null;
  editedText: string | null;
  provider: string;
  version: number;
  stale: boolean;
  rejected: boolean;
  validationStatus: string;
}

export function TranslateStep({
  noticeId,
  languages,
  base,
  baseIsSimplified,
  translations,
  editable,
  canReject,
  initialLanguage,
}: {
  noticeId: string;
  languages: Language[];
  base: string;
  baseIsSimplified: boolean;
  translations: TranslationView[];
  editable: boolean;
  canReject: boolean;
  initialLanguage?: Language;
}) {
  const { t } = useI18n();
  const [active, setActive] = useState<Language>(initialLanguage && languages.includes(initialLanguage) ? initialLanguage : languages[0]!);

  return (
    <Card>
      <div role="tablist" aria-label={t("common.languages")} className="mb-4 flex flex-wrap gap-2 border-b border-line pb-3">
        {languages.map((lang) => {
          const tr = translations.find((x) => x.language === lang);
          const warn = !tr || tr.stale || tr.rejected || tr.validationStatus === "ISSUES";
          return (
            <button
              key={lang}
              role="tab"
              id={`tab-${lang}`}
              aria-selected={active === lang}
              aria-controls={`panel-${lang}`}
              onClick={() => setActive(lang)}
              className={cn(
                "flex min-h-11 items-center gap-2 rounded-md border px-4 text-sm font-medium",
                active === lang ? "border-navy-600 bg-navy-50 text-navy-700" : "border-line bg-white text-ink-muted hover:bg-gray-50",
              )}
            >
              <span lang={LANGUAGE_LOCALE[lang]}>{LANGUAGE_NATIVE_NAME[lang]}</span>
              {warn && <span className="h-2 w-2 rounded-full bg-warn-600" aria-label={t("common.status")} />}
            </button>
          );
        })}
      </div>
      {languages.map((lang) => (
        <div key={lang} role="tabpanel" id={`panel-${lang}`} aria-labelledby={`tab-${lang}`} hidden={active !== lang}>
          {active === lang && (
            <LanguagePanel
              noticeId={noticeId}
              language={lang}
              base={base}
              baseIsSimplified={baseIsSimplified}
              translation={translations.find((x) => x.language === lang)}
              editable={editable}
              canReject={canReject}
            />
          )}
        </div>
      ))}
      <div className="mt-4 flex justify-end">
        <LinkButton href={`/notices/${noticeId}?step=validate`}>{t("common.next")}</LinkButton>
      </div>
    </Card>
  );
}

function LanguagePanel({
  noticeId,
  language,
  base,
  baseIsSimplified,
  translation,
  editable,
  canReject,
}: {
  noticeId: string;
  language: Language;
  base: string;
  baseIsSimplified: boolean;
  translation?: TranslationView;
  editable: boolean;
  canReject: boolean;
}) {
  const { t } = useI18n();
  const { busy, feedback, run } = useAction();
  const [text, setText] = useState(translation?.translatedText ?? "");
  const [synced, setSynced] = useState(translation?.translatedText ?? "");
  const [compare, setCompare] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  if ((translation?.translatedText ?? "") !== synced) {
    setSynced(translation?.translatedText ?? "");
    setText(translation?.translatedText ?? "");
  }
  const dirty = text.trim() !== (translation?.translatedText ?? "").trim();
  const post = (body: Record<string, unknown>) => api(`/api/notices/${noticeId}/translations`, { method: "POST", body: { language, ...body } });
  const simulated = translation && translation.provider === "demo" && !translation.editedText;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {translation ? (
          <>
            <Badge tone={translation.editedText ? "info" : "neutral"}>{translation.editedText ? t("wizard.translate.edited") : t("wizard.translate.generated")}</Badge>
            {simulated && <Badge tone="warn">{t("wizard.translate.simulated")}</Badge>}
            {!simulated && translation.provider !== "manual" && <Badge>{t("wizard.translate.provider", { provider: translation.provider })}</Badge>}
            <span className="text-ink-faint">v{translation.version}</span>
          </>
        ) : (
          <span className="text-ink-muted">{t("wizard.translate.notYet")}</span>
        )}
        <span className="ml-auto text-ink-muted">
          {t("wizard.translate.base")}: {baseIsSimplified ? t("wizard.simplify.simplified") : t("wizard.simplify.original")}
        </span>
      </div>
      {translation?.stale && <Alert tone="warn">{t("wizard.translate.stale")}</Alert>}
      {translation?.rejected && <Alert tone="danger">{t("wizard.translate.rejected")}</Alert>}
      {feedback && <Alert tone={feedback.tone}>{feedback.text}</Alert>}

      <div className={cn("grid gap-3", compare && "lg:grid-cols-2")}>
        {compare && (
          <div>
            <p className="mb-1 text-sm font-medium">{baseIsSimplified ? t("wizard.simplify.simplified") : t("wizard.simplify.original")}</p>
            <p className="min-h-28 whitespace-pre-wrap rounded-md border border-line bg-gray-50 p-3 text-sm leading-relaxed">{base}</p>
          </div>
        )}
        <div>
          <label htmlFor={`tr-${language}`} className="mb-1 block text-sm font-medium">
            {LANGUAGE_NATIVE_NAME[language]}
          </label>
          <Textarea
            id={`tr-${language}`}
            lang={LANGUAGE_LOCALE[language]}
            rows={12}
            value={text}
            onChange={(e) => setText(e.target.value)}
            readOnly={!editable}
            className="leading-relaxed"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {editable && (
          <Button loading={busy === "generate"} onClick={() => run("generate", () => post({ action: "generate" }))}>
            <Languages className="h-4 w-4" aria-hidden />
            {translation ? t("wizard.translate.regenerate") : t("wizard.translate.generate")}
          </Button>
        )}
        {editable && (
          <Button
            variant="secondary"
            disabled={!dirty || !text.trim()}
            loading={busy === "save"}
            onClick={() => run("save", () => api(`/api/notices/${noticeId}/translations`, { method: "PUT", body: { language, text } }), t("wizard.saved"))}
          >
            {t("wizard.translate.saveEdit")}
          </Button>
        )}
        {editable && translation?.editedText && translation.generatedText && (
          <Button variant="ghost" loading={busy === "reset"} onClick={() => run("reset", () => post({ action: "reset" }))}>
            {t("wizard.translate.reset")}
          </Button>
        )}
        <Button variant="ghost" onClick={() => setCompare((c) => !c)} aria-pressed={compare}>
          {compare ? t("wizard.translate.hideCompare") : t("wizard.translate.compare")}
        </Button>
        {canReject && translation && !translation.rejected && (
          <Button variant="ghost" className="text-danger-700" onClick={() => setRejecting((r) => !r)} aria-expanded={rejecting}>
            {t("wizard.translate.reject")}
          </Button>
        )}
      </div>
      {dirty && editable && <p className="text-sm text-warn-700">{t("wizard.unsaved")}</p>}
      {rejecting && (
        <form
          className="flex flex-wrap items-end gap-2 rounded-md border border-danger-100 bg-danger-50 p-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await run("reject", () => post({ action: "reject", reason }));
            if (ok) setRejecting(false);
          }}
        >
          <div className="min-w-60 flex-1">
            <label htmlFor={`reject-${language}`} className="mb-1 block text-sm font-medium">
              {t("wizard.translate.rejectReason")}
            </label>
            <Input id={`reject-${language}`} value={reason} onChange={(e) => setReason(e.target.value)} required minLength={5} maxLength={500} />
          </div>
          <Button type="submit" variant="danger" loading={busy === "reject"} disabled={reason.trim().length < 5}>
            {t("wizard.translate.reject")}
          </Button>
        </form>
      )}
    </div>
  );
}
