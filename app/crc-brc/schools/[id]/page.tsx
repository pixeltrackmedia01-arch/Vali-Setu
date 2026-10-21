import { notFound } from "next/navigation";
import { BarRateChart, TrendChart } from "@/components/analytics/Charts";
import { Methodology } from "@/components/analytics/Methodology";
import { chartLabels } from "@/components/analytics/RegionView";
import { Card, CardHeader, LinkButton, PageHeader, StatCard, Table, Td, Th } from "@/components/ui";
import { requireUser } from "@/lib/auth/guard";
import { LANGUAGE_NATIVE_NAME, isLanguage, type Channel, type NoticeCategory } from "@/lib/domain/constants";
import { getT } from "@/lib/i18n/server";
import { formatDate } from "@/lib/utils";
import { regionSchoolDetail } from "@/services/analytics";

export const metadata = { title: "School detail" };

export default async function RegionSchool({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(["CRC_OFFICER", "BRC_OFFICER"]);
  const { t, locale } = await getT();
  const detail = await regionSchoolDetail(user, (await params).id);
  if (!detail) notFound();
  const { school } = detail;
  const labels = chartLabels(t);
  return (
    <>
      <PageHeader
        title={school.name}
        description={`${t("region.schoolDetail")} · ${school.block} / ${school.cluster} · ${t("region.demoFigures")}`}
        actions={<LinkButton variant="secondary" href="/crc-brc/schools">{t("common.back")}</LinkButton>}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label={t("region.col.families")} value={school.families} />
        <StatCard label={t("region.col.notices")} value={school.noticesSent} />
        <StatCard label={t("region.col.delivery")} value={`${school.deliveryRate}%`} />
        <StatCard label={t("region.col.ack")} value={`${school.ackRate}%`} />
        <StatCard label={t("region.col.pending")} value={school.pendingQuestions} />
        <StatCard label={t("region.col.followUp")} value={school.needsFollowUp ? t("region.needsFollowUp") : t("region.onTrack")} tone={school.needsFollowUp ? "warn" : "neutral"} />
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <BarRateChart title={t("region.chartReachByLanguage")} data={detail.byLanguage.map((r) => ({ label: isLanguage(r.key) ? LANGUAGE_NATIVE_NAME[r.key] : r.key, value: r.deliveryRate }))} labels={labels} />
        <BarRateChart title={t("region.chartChannel")} data={detail.byChannel.map((r) => ({ label: t(`channel.${r.key as Channel}`), value: r.deliveryRate }))} labels={labels} />
        <TrendChart title={t("region.chartEngagement")} unit="%" data={detail.weekly.map((w) => ({ label: w.week.slice(5), value: w.engagement }))} labels={labels} />
      </div>
      <Card className="mt-6">
        <CardHeader title={t("region.noticesIssued")} level={2} />
        <Table caption={t("region.noticesIssued")}>
          <thead>
            <tr>
              <Th>{t("teacher.col.title")}</Th>
              <Th>{t("common.category")}</Th>
              <Th>{t("common.date")}</Th>
              <Th>{t("common.recipients")}</Th>
              <Th>{t("record.responses")}</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {detail.notices.map((n) => (
              <tr key={n.id}>
                <Td>{n.title}</Td>
                <Td>{t(`category.${n.category as NoticeCategory}`)}</Td>
                <Td>{formatDate(n.dispatchedAt, locale)}</Td>
                <Td className="tabular-nums">{n._count.recipients}</Td>
                <Td className="tabular-nums">{n._count.responses}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
      <Methodology t={t} extra={t("region.followUpRule")} />
    </>
  );
}
