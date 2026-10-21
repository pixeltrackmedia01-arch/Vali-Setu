import { Download } from "lucide-react";
import { Alert, Card, CardHeader, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/guard";
import { getT } from "@/lib/i18n/server";
import { canExportContacts } from "@/lib/permissions";

export const metadata = { title: "School reports" };

function ExportLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} download className="flex min-h-11 items-center gap-2 rounded-md border border-line bg-white px-4 py-3 text-sm font-medium text-navy-700 hover:bg-navy-50">
      <Download className="h-4 w-4" aria-hidden /> {label}
    </a>
  );
}

export default async function SchoolReports() {
  const user = await requireUser(["HEAD_TEACHER", "SCHOOL_ADMIN"]);
  const { t } = await getT();
  return (
    <>
      <PageHeader title={t("school.reportsTitle")} description={t("region.demoFigures")} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title={t("school.reportsTitle")} level={2} />
          <div className="space-y-2">
            <ExportLink href="/api/reports/export?type=deliveries" label={t("school.exportDeliveries")} />
            <ExportLink href="/api/reports/export?type=notices" label={t("school.exportNotices")} />
          </div>
        </Card>
        {canExportContacts(user) && (
          <Card>
            <CardHeader title={t("school.exportContacts")} level={2} />
            <Alert tone="warn" className="mb-3">
              {t("school.exportContactsNote")}
            </Alert>
            <ExportLink href="/api/reports/export?type=contacts" label={t("school.exportContacts")} />
          </Card>
        )}
      </div>
    </>
  );
}
