import { StatusBadge } from "@/components/notices/StatusBadge";
import { Badge, Card, CardHeader, EmptyState, LinkButton, PageHeader, Table, Td, Th } from "@/components/ui";
import { requireUser } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { LANGUAGE_LOCALE, LANGUAGE_NATIVE_NAME, isLanguage, type Channel } from "@/lib/domain/constants";
import { getT } from "@/lib/i18n/server";
import { formatDate, maskPhone, splitList } from "@/lib/utils";
import { loadNoticeOr404 } from "@/services/notices/load";

export const metadata = { title: "Notice record" };

export default async function NoticeRecord({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(["TEACHER", "HEAD_TEACHER", "SCHOOL_ADMIN"]);
  const { t, locale } = await getT();
  const { id } = await params;
  const notice = await loadNoticeOr404(user, id);
  const [revisions, recipients, responses, followUps, auditRows, dispatch] = await Promise.all([
    db.translationRevision.findMany({ where: { translation: { noticeId: id } }, orderBy: { createdAt: "desc" }, include: { translation: { select: { language: true } } } }),
    db.noticeRecipient.findMany({
      where: { noticeId: id },
      orderBy: [{ deliveryStatus: "asc" }, { guardian: { displayName: "asc" } }],
      take: 200,
      include: { guardian: { select: { displayName: true, phone: true } }, attempts: { orderBy: { attemptNumber: "asc" } } },
    }),
    db.parentResponse.findMany({ where: { noticeId: id }, orderBy: { createdAt: "desc" }, take: 100, include: { guardian: { select: { displayName: true } } } }),
    db.followUpTask.findMany({ where: { noticeId: id }, orderBy: { createdAt: "desc" }, include: { guardian: { select: { displayName: true } } } }),
    db.auditLog.findMany({
      where: { OR: [{ entityType: "Notice", entityId: id }, { entityType: "NoticeTranslation", entityId: { in: notice.translations.map((x) => x.id) } }, { entityType: "NoticeValidation", entityId: { in: notice.validations.map((v) => v.id) } }] },
      orderBy: { timestamp: "desc" },
      take: 100,
      include: { actor: { select: { name: true } } },
    }),
    db.dispatchRequest.findUnique({ where: { noticeId: id } }),
  ]);
  const lang = (l: string) => (isLanguage(l) ? LANGUAGE_NATIVE_NAME[l] : l);

  return (
    <>
      <PageHeader
        title={t("record.title")}
        description={notice.title}
        actions={
          <>
            <LinkButton variant="secondary" href={`/notices/${id}`}>
              {t("wizard.title")}
            </LinkButton>
            <LinkButton variant="secondary" href={`/notices/${id}/basic-phone`}>
              {t("wizard.review.basicPhone")}
            </LinkButton>
          </>
        }
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title={t("record.source")} level={2} />
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{notice.sourceText}</p>
          <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <dt className="text-ink-muted">{t("common.status")}</dt>
            <dd>
              <StatusBadge status={notice.workflowStatus} label={t(`status.${notice.workflowStatus as "DRAFT"}`)} />
            </dd>
            <dt className="text-ink-muted">{t("record.approver")}</dt>
            <dd>{notice.approvedBy?.name ?? "—"}</dd>
            <dt className="text-ink-muted">{t("record.approvedAt")}</dt>
            <dd>{formatDate(notice.approvedAt, locale, true) || "—"}</dd>
            <dt className="text-ink-muted">{t("record.dispatchConfig")}</dt>
            <dd>
              {splitList(notice.channels).map((c) => t(`channel.${c as Channel}`)).join(", ")} · {splitList(notice.targetLanguages).map(lang).join(", ")}
              {dispatch && <span className="block text-xs text-ink-muted">{dispatch.mode === "demo" ? t("common.simulated") : "live"} · {formatDate(dispatch.createdAt, locale, true)}</span>}
            </dd>
          </dl>
        </Card>

        <Card>
          <CardHeader title={t("record.versions")} level={2} />
          <ol className="space-y-3">
            {notice.versions.map((v) => (
              <li key={v.id} className="rounded-md border border-line p-3 text-sm">
                <p className="font-medium">
                  {t("record.version", { version: v.version })} · {formatDate(v.createdAt, locale, true)}
                </p>
                <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-ink-muted">{v.simplifiedText ?? v.sourceText}</p>
              </li>
            ))}
          </ol>
        </Card>

        <Card>
          <CardHeader title={t("record.translations")} level={2} />
          {revisions.length === 0 ? (
            <EmptyState title={t("wizard.translate.notYet")} />
          ) : (
            <ul className="space-y-2 text-sm">
              {revisions.slice(0, 30).map((r) => (
                <li key={r.id} className="rounded-md border border-line p-3">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    {lang(r.translation.language)} v{r.version} <Badge>{r.origin}</Badge>
                    {r.provider === "demo" && <Badge tone="warn">{t("common.simulated")}</Badge>}
                    <span className="text-xs font-normal text-ink-muted">{formatDate(r.createdAt, locale, true)}</span>
                  </p>
                  <p lang={isLanguage(r.translation.language) ? LANGUAGE_LOCALE[r.translation.language] : undefined} className="mt-1 line-clamp-2 text-ink-muted">
                    {r.text}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title={t("record.validation")} level={2} />
          {notice.validations.length === 0 ? (
            <EmptyState title={t("wizard.validate.notRun")} />
          ) : (
            <Table caption={t("record.validation")}>
              <thead>
                <tr>
                  <Th>{t("common.language")}</Th>
                  <Th>{t("wizard.validate.col.detail")}</Th>
                  <Th>{t("wizard.validate.col.status")}</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {notice.validations
                  .filter((v) => v.status !== "MATCHED")
                  .map((v) => (
                    <tr key={v.id}>
                      <Td>{v.target === "simplified" ? t("wizard.validate.target.simplified") : lang(v.target)}</Td>
                      <Td>
                        {t(`wizard.validate.fieldTypes.${v.fieldType as "date"}`)}: {v.sourceValue} → {v.translatedValue ?? "—"}
                      </Td>
                      <Td>
                        <StatusBadge status={v.status} label={t(`wizard.validate.statuses.${v.status as "MATCHED"}`)} />{" "}
                        {v.resolution !== "OPEN" && <Badge>{v.resolution === "OVERRIDDEN" ? t("wizard.validate.overridden") : t("wizard.validate.reviewedBy")}</Badge>}
                      </Td>
                    </tr>
                  ))}
              </tbody>
            </Table>
          )}
          <p className="mt-2 text-xs text-ink-muted">
            {notice.validations.filter((v) => v.status === "MATCHED").length} {t("wizard.validate.statuses.MATCHED")}
          </p>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title={t("record.deliveries")} description={dispatch?.mode === "demo" ? t("app.demoBanner") : undefined} level={2} />
        {recipients.length === 0 ? (
          <EmptyState title={t("teacher.notDispatched")} />
        ) : (
          <Table caption={t("record.deliveries")}>
            <thead>
              <tr>
                <Th>{t("school.col.parent")}</Th>
                <Th>{t("school.phone")}</Th>
                <Th>{t("school.col.channel")}</Th>
                <Th>{t("school.col.language")}</Th>
                <Th>{t("school.col.delivery")}</Th>
                <Th>{t("record.providerRef")}</Th>
                <Th>{t("school.col.ack")}</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {recipients.map((r) => (
                <tr key={r.id}>
                  <Td>{r.guardian.displayName}</Td>
                  <Td className="tabular-nums">{maskPhone(r.guardian.phone)}</Td>
                  <Td>{t(`channel.${r.channel as Channel}`)}</Td>
                  <Td>{lang(r.language)}</Td>
                  <Td>
                    <StatusBadge status={r.deliveryStatus} label={t(`status.${r.deliveryStatus as "DELIVERED"}`)} />
                    {r.failureReason && <span className="block text-xs text-ink-muted">{r.failureReason}</span>}
                  </Td>
                  <Td className="text-xs text-ink-muted">
                    {r.attempts.map((a) => (
                      <span key={a.id} className="block">
                        {t("record.attempt", { n: a.attemptNumber })}: {a.status} {a.providerMessageId ? `· ${a.providerMessageId.slice(0, 18)}` : ""}
                      </span>
                    ))}
                  </Td>
                  <Td>{r.acknowledgedAt ? formatDate(r.acknowledgedAt, locale, true) : "—"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title={t("record.responses")} level={2} />
          {responses.length === 0 ? (
            <EmptyState title={t("record.noResponses")} />
          ) : (
            <ul className="divide-y divide-line text-sm">
              {responses.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-2 py-2">
                  <span className="font-medium">{r.guardian.displayName}</span>
                  <Badge tone={r.responseType === "ACKNOWLEDGED" ? "success" : "info"}>
                    {r.responseType === "QUESTION" && r.questionCategory ? t(`responses.categories.${r.questionCategory as "OTHER"}`) : r.responseType === "ACKNOWLEDGED" ? t("parent.understood") : r.responseType}
                  </Badge>
                  {r.responseType === "QUESTION" && <StatusBadge status={r.status} label={r.status === "OPEN" ? t("responses.open") : t("responses.answered")} />}
                  <span className="ml-auto text-xs text-ink-muted">{formatDate(r.createdAt, locale, true)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title={t("record.followUps")} level={2} />
          {followUps.length === 0 ? (
            <EmptyState title={t("record.noFollowUps")} />
          ) : (
            <ul className="divide-y divide-line text-sm">
              {followUps.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center gap-2 py-2">
                  <span className="font-medium">{f.guardian?.displayName ?? "—"}</span>
                  <span className="text-ink-muted">{f.reason}</span>
                  <span className="ml-auto">
                    <StatusBadge status={f.status} label={t(`status.${f.status as "OPEN"}`)} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title={t("record.timeline")} description={t("record.audit")} level={2} />
        <ol className="relative space-y-3 border-l border-line pl-4 text-sm">
          {auditRows.map((a) => (
            <li key={a.id}>
              <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-navy-600" aria-hidden />
              <p>
                <span className="font-mono text-xs">{a.action}</span> · {a.actor?.name ?? "system"}
              </p>
              <p className="text-xs text-ink-muted">{formatDate(a.timestamp, locale, true)}</p>
            </li>
          ))}
        </ol>
      </Card>
    </>
  );
}
