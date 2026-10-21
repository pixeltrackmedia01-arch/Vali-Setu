import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/notices/StatusBadge";
import { ContactCorrection } from "@/components/school/ContactCorrection";
import { FollowUpButton } from "@/components/school/FollowUpButton";
import { Card, CardHeader, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui";
import { requireUser } from "@/lib/auth/guard";
import { LANGUAGE_NATIVE_NAME, isLanguage, type Channel } from "@/lib/domain/constants";
import { getT } from "@/lib/i18n/server";
import { can } from "@/lib/permissions";
import { formatDate, maskPhone } from "@/lib/utils";
import { NotFoundError } from "@/services/errors";
import { getFamily } from "@/services/school";

export const metadata = { title: "Family record" };

export default async function FamilyRecord({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(["HEAD_TEACHER", "SCHOOL_ADMIN"]);
  const { t, locale } = await getT();
  const { id } = await params;
  const family = await getFamily(user, id).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });
  return (
    <>
      <PageHeader title={family.displayName} description={t("school.familyRecord")} actions={<FollowUpButton guardianId={family.id} reason={t("school.familyRecord")} open={family.followUps.some((f) => f.status === "OPEN")} />} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-ink-muted">{t("school.students")}</dt>
            <dd>{family.students.map((s) => `${s.student.displayName} (${s.student.classSection.grade}${s.student.classSection.section}) · ${s.relationship}`).join(", ")}</dd>
            <dt className="text-ink-muted">{t("school.col.language")}</dt>
            <dd>{isLanguage(family.preferredLanguage) ? LANGUAGE_NATIVE_NAME[family.preferredLanguage] : family.preferredLanguage}</dd>
            <dt className="text-ink-muted">{t("school.col.channel")}</dt>
            <dd>{t(`channel.${family.preferredChannel as Channel}`)}</dd>
            <dt className="text-ink-muted">{t("school.phone")}</dt>
            <dd className="tabular-nums">{maskPhone(family.phone)}</dd>
            <dt className="text-ink-muted">{t("school.consent")}</dt>
            <dd>{t(`school.consentStatus.${family.consentStatus as "GRANTED"}`)}</dd>
          </dl>
        </Card>
        <Card>
          <CardHeader title={t("school.correction")} level={3} />
          {family.contactCorrectionNote ? (
            <>
              <p className="rounded-md bg-warn-50 p-3 text-sm">{family.contactCorrectionNote}</p>
              {can(user, "school.manage") && <ContactCorrection guardianId={family.id} />}
            </>
          ) : (
            <p className="text-sm text-ink-muted">{t("school.noCorrection")}</p>
          )}
        </Card>
      </div>
      <Card className="mt-4">
        <CardHeader title={t("record.deliveries")} level={3} />
        {family.recipients.length === 0 ? (
          <EmptyState title={t("common.noData")} />
        ) : (
          <Table caption={t("record.deliveries")}>
            <thead>
              <tr>
                <Th>{t("school.col.notice")}</Th>
                <Th>{t("school.col.channel")}</Th>
                <Th>{t("school.col.delivery")}</Th>
                <Th>{t("school.col.read")}</Th>
                <Th>{t("school.col.ack")}</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {family.recipients.map((r) => (
                <tr key={r.id}>
                  <Td>
                    <Link href={`/notices/${r.notice.id}/record`} className="text-navy-700 hover:underline">
                      {r.notice.title}
                    </Link>
                  </Td>
                  <Td>{t(`channel.${r.channel as Channel}`)}</Td>
                  <Td>
                    <StatusBadge status={r.deliveryStatus} label={t(`status.${r.deliveryStatus as "DELIVERED"}`)} />
                  </Td>
                  <Td>{formatDate(r.readAt, locale, true) || "—"}</Td>
                  <Td>{formatDate(r.acknowledgedAt, locale, true) || "—"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("record.responses")} level={3} />
          {family.responses.length === 0 ? (
            <EmptyState title={t("record.noResponses")} />
          ) : (
            <ul className="divide-y divide-line text-sm">
              {family.responses.map((r) => (
                <li key={r.id} className="py-2">
                  <p className="font-medium">{r.notice.title}</p>
                  <p className="text-ink-muted">
                    {r.responseType === "QUESTION" && r.questionCategory ? t(`responses.categories.${r.questionCategory as "OTHER"}`) : t("parent.understood")} · {formatDate(r.createdAt, locale, true)}
                  </p>
                  {r.message && <p className="mt-1">{r.message}</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title={t("record.followUps")} level={3} />
          {family.followUps.length === 0 ? (
            <EmptyState title={t("record.noFollowUps")} />
          ) : (
            <ul className="divide-y divide-line text-sm">
              {family.followUps.map((f) => (
                <li key={f.id} className="flex items-center gap-2 py-2">
                  <span>{f.reason}</span>
                  <span className="ml-auto">
                    <StatusBadge status={f.status} label={t(`status.${f.status as "OPEN"}`)} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
