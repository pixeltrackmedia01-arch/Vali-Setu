import { SchoolSettingsForm } from "@/components/school/SchoolSettingsForm";
import { Card, CardHeader, PageHeader, Table, Td, Th } from "@/components/ui";
import { requireUser } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { isLanguage, type Role } from "@/lib/domain/constants";
import { getT } from "@/lib/i18n/server";
import { can } from "@/lib/permissions";
import { splitList } from "@/lib/utils";

export const metadata = { title: "School settings" };

export default async function SchoolSettings() {
  const user = await requireUser(["HEAD_TEACHER", "SCHOOL_ADMIN"]);
  const { t } = await getT();
  const school = await db.school.findUnique({
    where: { id: user.schoolId ?? "__none__" },
    include: { users: { where: { role: { not: "PARENT" } }, orderBy: { name: "asc" }, select: { id: true, name: true, email: true, role: true, canApprove: true } } },
  });
  if (!school) return null;
  return (
    <>
      <PageHeader title={t("school.settingsTitle")} description={school.name} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <dl className="mb-4 grid grid-cols-2 gap-2 text-sm">
            <dt className="text-ink-muted">{t("school.code")}</dt>
            <dd>{school.code}</dd>
            <dt className="text-ink-muted">{t("school.address")}</dt>
            <dd>{school.address}</dd>
            <dt className="text-ink-muted">{t("common.block")}</dt>
            <dd>
              {school.block} / {school.cluster}
            </dd>
          </dl>
          <SchoolSettingsForm helpline={school.helpline ?? ""} languages={splitList(school.supportedLanguages).filter(isLanguage)} readOnly={!can(user, "school.manage")} />
        </Card>
        <Card>
          <CardHeader title={t("school.staff")} level={2} />
          <Table caption={t("school.staff")}>
            <thead>
              <tr>
                <Th>{t("common.name")}</Th>
                <Th>{t("common.role")}</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {school.users.map((u) => (
                <tr key={u.id}>
                  <Td>
                    {u.name}
                    <span className="block text-xs text-ink-muted">{u.email}</span>
                  </Td>
                  <Td>
                    {t(`roles.${u.role as Role}`)}
                    {u.canApprove && u.role === "TEACHER" && <span className="block text-xs text-ink-muted">{t("wizard.review.approve")}</span>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>
    </>
  );
}
