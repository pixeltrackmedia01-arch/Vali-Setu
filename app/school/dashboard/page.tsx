import Link from "next/link";
import { FilterBar, queryString } from "@/components/analytics/FilterBar";
import { Methodology } from "@/components/analytics/Methodology";
import { StatusBadge } from "@/components/notices/StatusBadge";
import { FollowUpButton } from "@/components/school/FollowUpButton";
import { Card, CardHeader, EmptyState, PageHeader, Pagination, StatCard, Table, Td, Th } from "@/components/ui";
import { parseFilters } from "@/lib/api/filters";
import { requireUser } from "@/lib/auth/guard";
import { LANGUAGE_NATIVE_NAME, isLanguage, type Channel } from "@/lib/domain/constants";
import { getT } from "@/lib/i18n/server";
import { formatDate } from "@/lib/utils";
import { schoolAnalytics, schoolDeliveryTable } from "@/services/analytics";
import { classOptionsFor } from "@/services/notices/class-options";

export const metadata = { title: "School dashboard" };

export default async function SchoolDashboard({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser(["HEAD_TEACHER", "SCHOOL_ADMIN"]);
  const { t, locale } = await getT();
  const q = await searchParams;
  const filters = parseFilters(q);
  const page = Math.max(1, Number(q.page) || 1);
  const [{ metrics }, table, classes] = await Promise.all([
    schoolAnalytics(user, filters),
    schoolDeliveryTable(user, filters, page),
    classOptionsFor({ ...user, role: "HEAD_TEACHER" }),
  ]);
  const pages = Math.max(1, Math.ceil(table.total / table.pageSize));
  const tick = (d: Date | null) => (d ? <span title={formatDate(d, locale, true)}>✓</span> : <span className="text-ink-faint">—</span>);

  return (
    <>
      <PageHeader title={t("school.title")} description={t("app.demoBanner")} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={t("school.families")} value={metrics.families} />
        <StatCard label={t("school.noticesSent")} value={metrics.noticesSent} />
        <StatCard label={t("school.delivered")} value={metrics.delivered} hint={`${metrics.deliveryRate}%`} tone="success" />
        <StatCard label={t("school.awaiting")} value={metrics.awaiting} />
        <StatCard label={t("school.readAck")} value={metrics.readOrAcknowledged} hint={`${t("teacher.ackRate")}: ${metrics.ackRate}%`} />
        <StatCard label={t("school.audioPlays")} value={metrics.audioPlayed} />
        <StatCard label={t("school.questions")} value={metrics.questions} href={user.role === "SCHOOL_ADMIN" ? "/school/responses" : "/teacher/responses"} />
        <StatCard label={t("school.followUpFamilies")} value={metrics.followUpFamilies} tone={metrics.followUpFamilies ? "warn" : "neutral"} />
      </div>

      <h2 className="mb-3 mt-8 text-lg">{t("school.deliveryTable")}</h2>
      <FilterBar
        t={t}
        q={q}
        basePath="/school/dashboard"
        fields={["class", "section", "language", "channel", "category", "status", "from", "to"]}
        classes={classes}
        exportHref={`/api/reports/export?${queryString(q, { type: "deliveries" })}`}
      />
      <Card>
        <CardHeader title={t("school.deliveryTable")} description={`${t("common.total")}: ${table.total}`} level={3} />
        {table.rows.length === 0 ? (
          <EmptyState title={t("common.noResults")} />
        ) : (
          <Table caption={t("school.deliveryTable")}>
            <thead>
              <tr>
                <Th>{t("school.col.parent")}</Th>
                <Th>{t("school.col.class")}</Th>
                <Th>{t("school.col.notice")}</Th>
                <Th>{t("school.col.language")}</Th>
                <Th>{t("school.col.channel")}</Th>
                <Th>{t("school.col.delivery")}</Th>
                <Th>{t("school.col.read")}</Th>
                <Th>{t("school.col.audio")}</Th>
                <Th>{t("school.col.ack")}</Th>
                <Th>{t("school.col.lastActivity")}</Th>
                <Th>{t("school.col.followUp")}</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {table.rows.map((r) => (
                <tr key={r.id} className={r.needsFollowUp ? "bg-warn-50/50" : undefined}>
                  <Td>
                    <Link href={`/school/parents/${r.guardianId}`} className="font-medium text-navy-700 hover:underline">
                      {r.guardianName}
                    </Link>
                  </Td>
                  <Td>{r.className}</Td>
                  <Td className="max-w-48 truncate">
                    <Link href={`/notices/${r.noticeId}/record`} className="hover:underline" title={r.noticeTitle}>
                      {r.noticeTitle}
                    </Link>
                  </Td>
                  <Td>{isLanguage(r.language) ? LANGUAGE_NATIVE_NAME[r.language] : r.language}</Td>
                  <Td>{t(`channel.${r.channel as Channel}`)}</Td>
                  <Td>
                    <StatusBadge status={r.deliveryStatus} label={t(`status.${r.deliveryStatus as "DELIVERED"}`)} />
                  </Td>
                  <Td>{tick(r.readAt)}</Td>
                  <Td>{tick(r.audioPlayedAt)}</Td>
                  <Td>
                    {r.acknowledgedAt ? tick(r.acknowledgedAt) : r.questionStatus === "OPEN" ? <StatusBadge status="OPEN" label={t("status.QUESTION_RECEIVED")} /> : tick(null)}
                  </Td>
                  <Td className="whitespace-nowrap text-xs text-ink-muted">{formatDate(r.lastActivity, locale, true)}</Td>
                  <Td>
                    {r.needsFollowUp || r.followUpOpen ? (
                      <FollowUpButton guardianId={r.guardianId} noticeId={r.noticeId} reason={t(`status.${r.deliveryStatus as "FAILED"}`)} open={r.followUpOpen} />
                    ) : null}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination
          page={page}
          pages={pages}
          hrefFor={(p) => `/school/dashboard?${queryString(q, { page: String(p) })}`}
          labels={{ previous: t("common.previous"), next: t("common.next"), page: t("common.page", { page, pages }) }}
        />
      </Card>
      <Methodology t={t} />
    </>
  );
}
