import { NoticeTable } from "@/components/notices/NoticeTable";
import { Card, CardHeader, LinkButton, PageHeader, StatCard } from "@/components/ui";
import { requireUser } from "@/lib/auth/guard";
import { getT } from "@/lib/i18n/server";
import { listNotices, teacherStats } from "@/services/notices/queries";

export const metadata = { title: "Overview" };

export default async function TeacherDashboard() {
  const user = await requireUser(["TEACHER", "HEAD_TEACHER"]);
  const { t, locale } = await getT();
  const [stats, recent] = await Promise.all([teacherStats(user), listNotices(user, { page: 1 })]);
  return (
    <>
      <PageHeader
        title={t("teacher.welcome", { name: user.name })}
        description={t("teacher.dashboardTitle")}
        actions={<LinkButton href="/teacher/create">+ {t("teacher.createCta")}</LinkButton>}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label={t("teacher.noticesThisMonth")} value={stats.thisMonth} />
        <StatCard label={t("teacher.awaitingApproval")} value={stats.pending} tone={stats.pending ? "warn" : "neutral"} href="/teacher/notices?status=PENDING_APPROVAL" />
        <StatCard label={t("teacher.recipients")} value={stats.recipients} />
        <StatCard label={t("teacher.ackRate")} value={`${stats.ackRate}%`} tone="success" />
        <StatCard label={t("teacher.unanswered")} value={stats.unanswered} tone={stats.unanswered ? "warn" : "neutral"} href="/teacher/responses" />
        <StatCard label={t("teacher.followUp")} value={stats.followUps} tone={stats.followUps ? "danger" : "neutral"} />
      </div>
      <Card className="mt-6">
        <CardHeader title={t("teacher.recent")} actions={<LinkButton href="/teacher/notices" variant="secondary" size="sm">{t("teacher.viewAll")}</LinkButton>} />
        <NoticeTable rows={recent.notices} t={t} locale={locale} />
      </Card>
    </>
  );
}
