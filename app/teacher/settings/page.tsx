import { LanguageSwitcher } from "@/components/layout/client-bits";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import { can } from "@/lib/permissions";

export const metadata = { title: "Settings" };

export default async function TeacherSettings() {
  const user = await requireUser(["TEACHER", "HEAD_TEACHER"]);
  const { t } = await getT();
  const assignments = await db.teacherAssignment.findMany({ where: { userId: user.id }, include: { classSection: true } });
  return (
    <>
      <PageHeader title={t("nav.settings")} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("common.profile")} level={2} />
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-ink-muted">{user.name}</dt>
            <dd>{t(`roles.${user.role}`)}</dd>
            <dt className="text-ink-muted">{t("teacher.col.classes")}</dt>
            <dd>{user.role === "HEAD_TEACHER" ? t("common.all") : assignments.map((a) => `${a.classSection.grade}${a.classSection.section}`).join(", ") || "—"}</dd>
            <dt className="text-ink-muted">{t("teacher.col.approval")}</dt>
            <dd>{can(user, "notice.approve") ? t("common.yes") : t("common.no")}</dd>
          </dl>
        </Card>
        <Card>
          <CardHeader title={t("lang.label")} level={2} />
          <LanguageSwitcher />
        </Card>
      </div>
    </>
  );
}
