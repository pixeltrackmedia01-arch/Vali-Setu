import { IvrDemo } from "@/components/notices/IvrDemo";
import { Alert, Card, CardHeader, LinkButton, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/guard";
import { LANGUAGE_LOCALE, LANGUAGE_NATIVE_NAME, isLanguage, type Language } from "@/lib/domain/constants";
import { getT } from "@/lib/i18n/server";
import { splitList } from "@/lib/utils";
import { findDemoSampleBySource, PTM_SMS } from "@/services/ai/demo-content";
import { loadNoticeOr404 } from "@/services/notices/load";

export const metadata = { title: "Basic-phone preview" };

/** Unicode SMS: 70 characters in one part, 67 per part when split. */
function smsParts(text: string): number {
  const unicode = /[^\x00-\x7F]/.test(text);
  const single = unicode ? 70 : 160;
  const multi = unicode ? 67 : 153;
  return text.length <= single ? 1 : Math.ceil(text.length / multi);
}

export default async function BasicPhonePreview({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(["TEACHER", "HEAD_TEACHER", "SCHOOL_ADMIN"]);
  const { t } = await getT();
  const { id } = await params;
  const notice = await loadNoticeOr404(user, id);
  const languages = splitList(notice.targetLanguages).filter(isLanguage);
  const sample = findDemoSampleBySource(notice.sourceText);
  const smsFor = (lang: Language) =>
    sample?.key === "ptm" ? PTM_SMS[lang] : notice.translations.find((x) => x.language === lang)?.translatedText ?? "";
  const first = languages[0] ?? "gu";

  return (
    <>
      <PageHeader
        title={t("basicPhone.title")}
        description={notice.title}
        actions={
          <LinkButton variant="secondary" href={`/notices/${id}?step=review`}>
            {t("common.back")}
          </LinkButton>
        }
      />
      <Alert tone="info" className="mb-4">
        {t("basicPhone.intro")} {t("basicPhone.noButtons")}
      </Alert>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("basicPhone.sms")} level={2} />
          <div className="grid gap-4 sm:grid-cols-2">
            {languages.map((lang) => {
              const text = smsFor(lang);
              return (
                <figure key={lang} className="mx-auto w-full max-w-[240px] rounded-[28px] border-4 border-ink bg-gray-100 p-3">
                  <figcaption className="mb-2 text-center text-xs text-ink-muted">{LANGUAGE_NATIVE_NAME[lang]}</figcaption>
                  <div className="min-h-40 rounded-md bg-[#c7d4b8] p-2 font-mono text-[13px] leading-snug text-black" lang={LANGUAGE_LOCALE[lang]}>
                    <p className="mb-1 text-[11px]">{notice.school.name.slice(0, 20)}</p>
                    {text || "—"}
                  </div>
                  <p className="mt-2 text-center text-xs text-ink-muted">
                    {t("basicPhone.smsChars", { count: text.length })} · {smsParts(text)} SMS
                  </p>
                </figure>
              );
            })}
          </div>
        </Card>
        <Card>
          <CardHeader title={t("basicPhone.voice")} level={2} />
          <IvrDemo
            school={notice.school.name}
            lang={LANGUAGE_LOCALE[first]}
            spoken={notice.translations.find((x) => x.language === first)?.translatedText ?? "—"}
          />
        </Card>
      </div>
    </>
  );
}
