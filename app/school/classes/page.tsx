import { Card, PageHeader, Table, Td, Th } from "@/components/ui";
import { requireUser } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Classes" };

export default async function Classes() {
  const user = await requireUser(["HEAD_TEACHER", "SCHOOL_ADMIN"]);
  const { t } = await getT();
  const sections = await db.classSection.findMany({
    where: { schoolId: user.schoolId ?? "__none__" },
    orderBy: [{ grade: "asc" }, { section: "asc" }],
    include: {
      _count: { select: { students: true } },
      assignments: { include: { user: { select: { name: true } } } },
      students: { select: { guardians: { select: { guardian: { select: { consentStatus: true, phone: true } } } } } },
    },
  });
  return (
    <>
      <PageHeader title={t("school.classesTitle")} />
      <Card>
        <Table caption={t("school.classesTitle")}>
          <thead>
            <tr>
              <Th>{t("common.class")}</Th>
              <Th>{t("school.students")}</Th>
              <Th>{t("school.teachers")}</Th>
              <Th>{t("school.families")}</Th>
              <Th>{t("school.consentStatus.GRANTED")}</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sections.map((s) => {
              const guardians = s.students.flatMap((st) => st.guardians.map((g) => g.guardian));
              return (
                <tr key={s.id}>
                  <Td className="font-medium">
                    {s.grade}
                    {s.section}
                  </Td>
                  <Td>{s._count.students}</Td>
                  <Td>{s.assignments.map((a) => a.user.name).join(", ") || "—"}</Td>
                  <Td>{guardians.length}</Td>
                  <Td>
                    {guardians.filter((g) => g.consentStatus === "GRANTED" && g.phone).length} / {guardians.length}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
