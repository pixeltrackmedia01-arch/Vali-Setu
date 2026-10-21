import { PreferencesForm } from "@/components/parent/PreferencesForm";
import { requireUser } from "@/lib/auth/guard";
import { isLanguage, type Channel } from "@/lib/domain/constants";
import { getT } from "@/lib/i18n/server";
import { maskPhone } from "@/lib/utils";
import { getParentProfile } from "@/services/parent";

export const metadata = { title: "Preferences" };

export default async function ParentPreferences() {
  const user = await requireUser(["PARENT"]);
  const { t } = await getT();
  const p = await getParentProfile(user);
  const school = p.students[0]?.student.school;
  return (
    <>
      <h1 className="mb-1 text-xl">{t("parent.preferencesTitle")}</h1>
      <p className="mb-4 text-sm text-ink-muted">
        {t("school.phone")}: {maskPhone(p.phone)}
        {school && ` · ${t("parent.schoolInfo")}: ${school.name}`}
      </p>
      <PreferencesForm
        initial={{
          language: isLanguage(p.preferredLanguage) ? p.preferredLanguage : "gu",
          channel: p.preferredChannel as Channel,
          urgentOnly: Boolean(p.prefs.urgentOnly),
          voice: Boolean(p.prefs.voice),
          correction: p.contactCorrectionNote ?? "",
        }}
      />
    </>
  );
}
