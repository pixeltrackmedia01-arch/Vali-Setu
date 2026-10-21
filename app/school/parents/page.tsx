import Link from "next/link";
import { FilterBar, queryString } from "@/components/analytics/FilterBar";
import { StatusBadge } from "@/components/notices/StatusBadge";
import { Card, EmptyState, PageHeader, Pagination, Table, Td, Th } from "@/components/ui";
import { requireUser } from "@/lib/auth/guard";
import { LANGUAGE_NATIVE_NAME, isLanguage, type Channel } from "@/lib/domain/constants";
import { getT } from "@/lib/i18n/server";
import { maskPhone } from "@/lib/utils";
import { classOptionsFor } from "@/services/notices/class-options";
import { listFamilies } from "@/services/school";

export const metadata = { title: "Families" };

export default async function Families({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser(["HEAD_TEACHER", "SCHOOL_ADMIN"]);
  const { t } = await getT();
  const q = await searchParams;
  const [data, classes] = await Promise.all([
    listFamilies(user, { search: q.search?.slice(0, 100), classSectionId: q.class, language: q.language, page: Number(q.page) || 1 }),
    classOptionsFor({ ...user, role: "HEAD_TEACHER" }),
  ]);
  return (
    <>
      <PageHeader title={t("school.parentsTitle")} description={`${t("common.total")}: ${data.total}`} />
      <FilterBar t={t} q={q} basePath="/school/parents" fields={["class", "language"]} classes={classes} />
      {data.families.length === 0 ? (
        <EmptyState title={t("common.noResults")} />
      ) : (
        <Card>
          <Table caption={t("school.parentsTitle")}>
            <thead>
              <tr>
                <Th>{t("school.col.parent")}</Th>
                <Th>{t("school.students")}</Th>
                <Th>{t("school.col.language")}</Th>
                <Th>{t("school.col.channel")}</Th>
                <Th>{t("school.phone")}</Th>
                <Th>{t("school.consent")}</Th>
                <Th>{t("school.col.followUp")}</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.families.map((f) => (
                <tr key={f.id}>
                  <Td>
                    <Link href={`/school/parents/${f.id}`} className="font-medium text-navy-700 hover:underline">
                      {f.displayName}
                    </Link>
                    {f.contactCorrectionNote && <span className="block text-xs text-warn-700">{t("school.correction")}</span>}
                  </Td>
                  <Td>{f.students.map((s) => `${s.student.displayName} (${s.student.classSection.grade}${s.student.classSection.section})`).join(", ")}</Td>
                  <Td>{isLanguage(f.preferredLanguage) ? LANGUAGE_NATIVE_NAME[f.preferredLanguage] : f.preferredLanguage}</Td>
                  <Td>{t(`channel.${f.preferredChannel as Channel}`)}</Td>
                  <Td className="tabular-nums">{maskPhone(f.phone)}</Td>
                  <Td>
                    <StatusBadge status={f.consentStatus === "GRANTED" ? "DONE" : "HIGH"} label={t(`school.consentStatus.${f.consentStatus as "GRANTED"}`)} />
                  </Td>
                  <Td>{f.followUps.length > 0 ? <StatusBadge status="OPEN" label={t("school.followUpOpen")} /> : null}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination
            page={data.page}
            pages={data.pages}
            hrefFor={(p) => `/school/parents?${queryString(q, { page: String(p) })}`}
            labels={{ previous: t("common.previous"), next: t("common.next"), page: t("common.page", { page: data.page, pages: data.pages }) }}
          />
        </Card>
      )}
    </>
  );
}
