import { Download } from "lucide-react";
import { Methodology } from "@/components/analytics/Methodology";
import { Alert, Card, CardHeader, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/guard";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Reports" };

export default async function Reports() {
  await requireUser(["CRC_OFFICER", "BRC_OFFICER"]);
  const { t } = await getT();
  return (
    <>
      <PageHeader title={t("nav.reports")} description={t("region.demoFigures")} />
      <Card className="max-w-xl">
        <CardHeader title={t("region.exportSummary")} description={t("region.notRanking")} level={2} />
        <Alert tone="info" className="mb-3">{t("region.method.demo")}</Alert>
        <a href="/api/reports/export?type=region" download className="inline-flex min-h-11 items-center gap-2 rounded-md bg-navy-600 px-4 text-sm font-medium text-white hover:bg-navy-700">
          <Download className="h-4 w-4" aria-hidden /> {t("region.exportSummary")}
        </a>
      </Card>
      <Methodology t={t} extra={t("region.followUpRule")} />
    </>
  );
}
