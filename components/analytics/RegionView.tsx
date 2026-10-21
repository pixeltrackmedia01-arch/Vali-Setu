import Link from "next/link";
import { BarRateChart, TrendChart, type ChartLabels } from "@/components/analytics/Charts";
import { FilterBar, queryString } from "@/components/analytics/FilterBar";
import { Methodology } from "@/components/analytics/Methodology";
import { StatusBadge } from "@/components/notices/StatusBadge";
import { Card, CardHeader, PageHeader, StatCard, Table, Td, Th } from "@/components/ui";
import { parseFilters } from "@/lib/api/filters";
import type { SessionUser } from "@/lib/auth/session";
import { LANGUAGE_NATIVE_NAME, isLanguage, type Channel } from "@/lib/domain/constants";
import type { Translator } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { regionAnalytics } from "@/services/analytics";

export function chartLabels(t: Translator): ChartLabels {
  return { show: t("region.showTable"), item: t("region.item"), value: t("region.value"), empty: t("common.noData") };
}

/**
 * Aggregate view for CRC/BRC and district users. Shows counts and rates only:
 * no parent names or phone numbers ever reach these pages.
 */
export async function RegionView({
  user,
  q,
  basePath,
  variant,
}: {
  user: SessionUser;
  q: Record<string, string | undefined>;
  basePath: string;
  variant: "crc" | "district" | "analytics" | "schools";
}) {
  const { t } = await getT();
  const data = await regionAnalytics(user, parseFilters(q));
  const m = data.metrics;
  const labels = chartLabels(t);
  const schoolHref = (id: string) => (user.role === "DISTRICT_OFFICIAL" ? `/district/analytics?school=${id}` : `/crc-brc/schools/${id}`);
  const title = variant === "crc" ? t("region.crcTitle") : variant === "district" ? t("region.districtTitle") : variant === "schools" ? t("region.comparison") : t("nav.analytics");
  const lang = (k: string) => (isLanguage(k) ? LANGUAGE_NATIVE_NAME[k] : k);
  const showCharts = variant !== "schools";
  const showTable = variant !== "analytics";

  return (
    <>
      <PageHeader title={title} description={t("region.demoFigures")} />
      <FilterBar
        t={t}
        q={q}
        basePath={basePath}
        fields={["block", "school", "language", "channel", "category", "from", "to"].filter((f) => user.role !== "CRC_OFFICER" || f !== "block") as never}
        schools={data.schools.map((s) => ({ id: s.id, name: s.name }))}
        blocks={data.blocks}
        exportHref={`/api/reports/export?${queryString(q, { type: "region" })}`}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label={variant === "crc" ? t("region.assignedSchools") : t("region.schools")} value={m.schools} />
        <StatCard label={t("region.parentRecords")} value={m.families} />
        <StatCard label={t("region.noticesIssued")} value={m.noticesSent} />
        <StatCard label={t("region.reach")} value={m.reach} hint={`${m.deliveryRate}%`} tone="success" />
        <StatCard label={t("region.ackRate")} value={`${m.ackRate}%`} />
        <StatCard label={t("region.deliveryFailure")} value={`${m.failureRate}%`} hint={`${t("region.failures")}: ${m.failures}`} tone={m.failureRate > 10 ? "warn" : "neutral"} />
        <StatCard label={t("region.unresolved")} value={m.unresolvedQuestions} tone={m.unresolvedQuestions ? "warn" : "neutral"} />
        <StatCard label={t("region.needingFollowUp")} value={m.schoolsNeedingFollowUp} tone={m.schoolsNeedingFollowUp ? "warn" : "neutral"} />
      </div>

      {showCharts && (
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <BarRateChart title={t("region.chartAckBySchool")} data={data.schools.map((s) => ({ label: s.name.replace(/^Setu Demo /, ""), value: s.ackRate }))} labels={labels} />
          <BarRateChart title={t("region.chartReachByLanguage")} description={t("region.col.delivery")} data={data.byLanguage.map((r) => ({ label: lang(r.key), value: r.deliveryRate }))} labels={labels} />
          <BarRateChart title={t("region.chartChannel")} data={data.byChannel.map((r) => ({ label: t(`channel.${r.key as Channel}`), value: r.deliveryRate }))} labels={labels} />
          <BarRateChart
            title={t("region.chartLanguageFamilies")}
            unit=""
            data={Object.entries(data.languageFamilies).map(([k, v]) => ({ label: lang(k), value: v }))}
            labels={labels}
          />
          <TrendChart title={t("region.chartWeekly")} data={data.weekly.map((w) => ({ label: w.week.slice(5), value: w.notices }))} labels={labels} />
          <TrendChart title={t("region.chartEngagement")} unit="%" data={data.weekly.map((w) => ({ label: w.week.slice(5), value: w.engagement }))} labels={labels} />
          {variant !== "crc" && (
            <>
              <BarRateChart title={t("region.chartQuestions")} unit="" data={data.schools.map((s) => ({ label: s.name.replace(/^Setu Demo /, ""), value: s.pendingQuestions }))} labels={labels} />
              <TrendChart title={t("region.chartCoverage")} data={data.weekly.map((w) => ({ label: w.week.slice(5), value: w.schoolsCovered }))} labels={labels} />
            </>
          )}
        </div>
      )}

      {showTable && (
        <Card className="mt-6">
          <CardHeader title={t("region.comparison")} description={`${t("region.notRanking")} ${t("region.followUpRule")}`} level={2} />
          <Table caption={t("region.comparison")}>
            <thead>
              <tr>
                <Th>{t("region.col.school")}</Th>
                <Th>{t("region.col.block")}</Th>
                <Th>{t("region.col.families")}</Th>
                <Th>{t("region.col.notices")}</Th>
                <Th>{t("region.col.delivery")}</Th>
                <Th>{t("region.col.ack")}</Th>
                <Th>{t("region.col.pending")}</Th>
                <Th>{t("region.col.followUp")}</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.schools.map((s) => (
                <tr key={s.id}>
                  <Td>
                    <Link href={schoolHref(s.id)} className="font-medium text-navy-700 hover:underline">
                      {s.name}
                    </Link>
                  </Td>
                  <Td>
                    {s.block} / {s.cluster}
                  </Td>
                  <Td className="tabular-nums">{s.families}</Td>
                  <Td className="tabular-nums">{s.noticesSent}</Td>
                  <Td className="tabular-nums">{s.deliveryRate}%</Td>
                  <Td className="tabular-nums">{s.ackRate}%</Td>
                  <Td className="tabular-nums">{s.pendingQuestions}</Td>
                  <Td>{s.needsFollowUp ? <StatusBadge status="HIGH" label={t("region.needsFollowUp")} /> : <span className="text-xs text-ink-muted">{t("region.onTrack")}</span>}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
      <Methodology t={t} extra={t("region.followUpRule")} />
    </>
  );
}
