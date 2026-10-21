"use client";

import { useState } from "react";
import { CheckCircle2, HelpCircle, Phone } from "lucide-react";
import { AudioPlayer } from "@/components/audio/AudioPlayer";
import { Alert, Button, Textarea } from "@/components/ui";
import { api, errorText, newKey } from "@/lib/api/client";
import { LANGUAGE_LOCALE, LANGUAGE_NATIVE_NAME, QUESTION_CATEGORIES, type Language, type QuestionCategory } from "@/lib/domain/constants";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

export interface MessageVersion {
  language: Language;
  text: string;
  audio: { id: string; status: string; provider: string } | null;
  keyDetails: { type: string; text: string }[];
}

export function ParentMessageView({
  noticeId,
  versions,
  defaultLanguage,
  acknowledged: initialAck,
  questions: initialQuestions,
  helpline,
}: {
  noticeId: string;
  versions: MessageVersion[];
  defaultLanguage: Language;
  acknowledged: boolean;
  questions: { id: string; category: string; message: string | null; status: string; reply: string | null }[];
  helpline: string | null;
}) {
  const { t } = useI18n();
  const [lang, setLang] = useState<Language>(versions.some((v) => v.language === defaultLanguage) ? defaultLanguage : versions[0]?.language ?? "gu");
  const [ack, setAck] = useState(initialAck);
  const [ackKey] = useState(newKey);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [category, setCategory] = useState<QuestionCategory>("NOT_UNDERSTOOD");
  const [message, setMessage] = useState("");
  const [callback, setCallback] = useState(false);
  const [questionKey, setQuestionKey] = useState(newKey);
  const [questions, setQuestions] = useState(initialQuestions);
  const version = versions.find((v) => v.language === lang) ?? versions[0];

  async function acknowledge() {
    setBusy("ack");
    setError(null);
    try {
      await api(`/api/parent/messages/${noticeId}/acknowledge`, { body: { clientKey: ackKey } });
      setAck(true);
      setNotice(t("parent.thanks"));
    } catch (err) {
      setError(errorText(err, t));
    } finally {
      setBusy(null);
    }
  }

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    setBusy("ask");
    setError(null);
    try {
      const res = await api<{ id: string }>(`/api/parent/messages/${noticeId}/questions`, { body: { category, message, callbackRequested: callback, clientKey: questionKey } });
      setQuestions((q) => (q.some((x) => x.id === res.id) ? q : [...q, { id: res.id, category, message, status: "OPEN", reply: null }]));
      setNotice(t("parent.questionSent"));
      setAsking(false);
      setMessage("");
      setCallback(false);
      setQuestionKey(newKey());
    } catch (err) {
      setError(errorText(err, t));
    } finally {
      setBusy(null);
    }
  }

  if (!version) return null;

  return (
    <div className="space-y-4">
      {versions.length > 1 && (
        <div role="tablist" aria-label={t("parent.showIn")} className="grid grid-flow-col gap-2">
          {versions.map((v) => (
            <button
              key={v.language}
              role="tab"
              aria-selected={lang === v.language}
              onClick={() => setLang(v.language)}
              lang={LANGUAGE_LOCALE[v.language]}
              className={cn(
                "min-h-12 rounded-md border text-base font-medium",
                lang === v.language ? "border-navy-600 bg-navy-600 text-white" : "border-line bg-white text-navy-700",
              )}
            >
              {LANGUAGE_NATIVE_NAME[v.language]}
            </button>
          ))}
        </div>
      )}

      <article role="tabpanel" className="rounded-lg border border-line bg-white p-4 shadow-card">
        <p lang={LANGUAGE_LOCALE[version.language]} className="whitespace-pre-wrap text-lg leading-loose">
          {version.text}
        </p>
      </article>

      <section aria-label={t("parent.listen")} className="rounded-lg border border-line bg-white p-4">
        {version.audio?.status === "READY" ? (
          <>
            <AudioPlayer
              key={version.audio.id}
              size="lg"
              src={`/api/audio/${version.audio.id}`}
              labels={{ play: t("parent.listen"), pause: t("parent.pause"), failed: t("parent.listenUnavailable") }}
              onFirstPlay={() => {
                api(`/api/parent/messages/${noticeId}/audio-played`, { method: "POST" }).catch(() => undefined);
              }}
            />
            {version.audio.provider.startsWith("demo") && <p className="mt-2 text-xs text-ink-muted">{t("parent.sampleAudio")}</p>}
          </>
        ) : version.audio?.status === "SIMULATED" ? (
          <p className="text-sm text-warn-700">{t("parent.simulatedAudio")}</p>
        ) : (
          <p className="text-sm text-ink-muted">{t("parent.listenUnavailable")}</p>
        )}
      </section>

      {version.keyDetails.length > 0 && (
        <section className="rounded-lg border border-navy-100 bg-navy-50 p-4">
          <h2 className="text-base">{t("parent.keyDetails")}</h2>
          <ul className="mt-2 space-y-1" lang={LANGUAGE_LOCALE[version.language]}>
            {version.keyDetails.map((d, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-ink-muted">{t(`wizard.validate.fieldTypes.${d.type as "date"}`)}:</span>
                <span className="font-semibold">{d.text}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {notice && <Alert tone="success">{notice}</Alert>}
      {error && <Alert tone="danger">{error}</Alert>}

      {ack ? (
        <p className="flex items-center gap-2 rounded-lg bg-success-50 p-4 font-medium text-success-700">
          <CheckCircle2 className="h-6 w-6" aria-hidden /> {t("parent.alreadyAck")}
        </p>
      ) : (
        <Button size="lg" variant="success" className="w-full" loading={busy === "ack"} onClick={acknowledge}>
          <CheckCircle2 className="h-6 w-6" aria-hidden /> {t("parent.understand")}
        </Button>
      )}

      {!asking ? (
        <Button size="lg" variant="secondary" className="w-full" onClick={() => setAsking(true)}>
          <HelpCircle className="h-6 w-6" aria-hidden /> {t("parent.haveQuestion")}
        </Button>
      ) : (
        <form onSubmit={ask} className="space-y-3 rounded-lg border border-line bg-white p-4">
          <h2 className="text-base">{t("parent.questionTitle")}</h2>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">{t("parent.questionCategory")}</legend>
            <div className="space-y-2">
              {QUESTION_CATEGORIES.map((c) => (
                <label key={c} className="flex min-h-12 items-center gap-3 rounded-md border border-line px-3">
                  <input type="radio" name="category" value={c} checked={category === c} onChange={() => setCategory(c)} className="h-5 w-5" />
                  {t(`responses.categories.${c}`)}
                </label>
              ))}
            </div>
          </fieldset>
          <label htmlFor="q-message" className="block text-sm font-medium">
            {t("parent.questionMessage")}
          </label>
          <Textarea id="q-message" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} />
          <label className="flex min-h-12 items-center gap-3">
            <input type="checkbox" checked={callback} onChange={(e) => setCallback(e.target.checked)} className="h-5 w-5" />
            {t("parent.callback")}
          </label>
          <div className="flex gap-2">
            <Button type="submit" size="lg" className="flex-1" loading={busy === "ask"}>
              {busy === "ask" ? t("parent.sending") : t("parent.send")}
            </Button>
            <Button type="button" size="lg" variant="ghost" onClick={() => setAsking(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      )}

      {questions.length > 0 && (
        <section>
          <h2 className="text-base">{t("parent.yourQuestions")}</h2>
          <ul className="mt-2 space-y-2">
            {questions.map((q) => (
              <li key={q.id} className="rounded-md border border-line bg-white p-3 text-sm">
                <p className="font-medium">{t(`responses.categories.${q.category as QuestionCategory}`)}</p>
                {q.message && <p className="mt-1">{q.message}</p>}
                <p className="mt-1 text-xs text-ink-muted">{t(`status.${q.status as "OPEN"}`)}</p>
                {q.reply && <p className="mt-1 text-success-700">↳ {q.reply}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {helpline && (
        <a href={`tel:${helpline.replace(/\s/g, "")}`} className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-line bg-white p-3 text-navy-700">
          <Phone className="h-5 w-5" aria-hidden /> {t("parent.help", { phone: helpline })}
        </a>
      )}
    </div>
  );
}
