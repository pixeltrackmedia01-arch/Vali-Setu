import { Button, Card, Input, LinkButton, PageHeader, Pagination, Select } from "@/components/ui";
import type { SessionUser } from "@/lib/auth/session";
import { CHANNELS, LANGUAGES, NOTICE_CATEGORIES, WORKFLOW_STATUSES } from "@/lib/domain/constants";
import { getT } from "@/lib/i18n/server";
import { can } from "@/lib/permissions";
import { listNotices } from "@/services/notices/queries";
import { NoticeTable } from "./NoticeTable";

type Q = Record<string, string | undefined>;

const TITLE_BY_STATUS: Record<string, "nav.drafts" | "nav.pending" | "nav.approved" | "nav.history"> = {
  DRAFT: "nav.drafts",
  PENDING_APPROVAL: "nav.pending",
  APPROVED: "nav.approved",
  DISPATCHED: "nav.history",
};

/** Searchable, filterable notice list shared by teacher and school views. Filters are a plain GET form. */
export async function NoticesListView({ user, q, basePath }: { user: SessionUser; q: Q; basePath: string }) {
  const { t, locale } = await getT();
  const date = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00+05:30`) : undefined);
  const data = await listNotices(user, {
    search: q.search?.slice(0, 100),
    status: q.status,
    category: q.category,
    language: q.language,
    channel: q.channel,
    from: date(q.from),
    to: q.to ? new Date(`${q.to}T23:59:59+05:30`) : undefined,
    page: Number(q.page) || 1,
  });
  const hrefFor = (page: number) => `${basePath}?${new URLSearchParams({ ...Object.fromEntries(Object.entries(q).filter(([, v]) => v)), page: String(page) } as Record<string, string>)}`;
  return (
    <>
      <PageHeader
        title={t(TITLE_BY_STATUS[q.status ?? ""] ?? "teacher.noticesTitle")}
        actions={can(user, "notice.create") ? <LinkButton href="/teacher/create">+ {t("teacher.createCta")}</LinkButton> : undefined}
      />
      <Card className="mb-4">
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8" role="search" method="get">
          <label className="sm:col-span-2">
            <span className="text-xs font-medium text-ink-muted">{t("common.search")}</span>
            <Input name="search" defaultValue={q.search} placeholder={t("teacher.searchPlaceholder")} />
          </label>
          <label>
            <span className="text-xs font-medium text-ink-muted">{t("common.status")}</span>
            <Select name="status" defaultValue={q.status ?? ""}>
              <option value="">{t("common.all")}</option>
              {WORKFLOW_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`status.${s}`)}
                </option>
              ))}
            </Select>
          </label>
          <label>
            <span className="text-xs font-medium text-ink-muted">{t("common.category")}</span>
            <Select name="category" defaultValue={q.category ?? ""}>
              <option value="">{t("common.all")}</option>
              {NOTICE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`category.${c}`)}
                </option>
              ))}
            </Select>
          </label>
          <label>
            <span className="text-xs font-medium text-ink-muted">{t("common.language")}</span>
            <Select name="language" defaultValue={q.language ?? ""}>
              <option value="">{t("common.all")}</option>
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {t(`lang.${l}`)}
                </option>
              ))}
            </Select>
          </label>
          <label>
            <span className="text-xs font-medium text-ink-muted">{t("common.channel")}</span>
            <Select name="channel" defaultValue={q.channel ?? ""}>
              <option value="">{t("common.all")}</option>
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {t(`channel.${c}`)}
                </option>
              ))}
            </Select>
          </label>
          <label>
            <span className="text-xs font-medium text-ink-muted">{t("common.from")}</span>
            <Input type="date" name="from" defaultValue={q.from} />
          </label>
          <label>
            <span className="text-xs font-medium text-ink-muted">{t("common.to")}</span>
            <Input type="date" name="to" defaultValue={q.to} />
          </label>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4 xl:col-span-8">
            <Button type="submit">{t("common.apply")}</Button>
            <LinkButton href={basePath} variant="ghost">
              {t("common.clear")}
            </LinkButton>
            <span className="ml-auto text-sm text-ink-muted" aria-live="polite">
              {t("common.total")}: {data.total}
            </span>
          </div>
        </form>
      </Card>
      <NoticeTable rows={data.notices} t={t} locale={locale} />
      <Pagination page={data.page} pages={data.pages} hrefFor={hrefFor} labels={{ previous: t("common.previous"), next: t("common.next"), page: t("common.page", { page: data.page, pages: data.pages }) }} />
    </>
  );
}
