import { Button, Card, Input, LinkButton, Select } from "@/components/ui";
import { CHANNELS, LANGUAGES, NOTICE_CATEGORIES } from "@/lib/domain/constants";
import type { Translator } from "@/lib/i18n";

type Field = "class" | "section" | "school" | "block" | "language" | "channel" | "category" | "status" | "from" | "to";

export const DELIVERY_FILTER_STATUSES = ["DELIVERED", "FAILED", "SKIPPED", "QUEUED", "READ", "AUDIO_PLAYED", "ACKNOWLEDGED", "NOT_ACKNOWLEDGED"] as const;

/** Dashboard filters as a plain GET form, so filtered views are shareable URLs and work without JavaScript. */
export function FilterBar({
  t,
  q,
  basePath,
  fields,
  classes = [],
  schools = [],
  blocks = [],
  exportHref,
}: {
  t: Translator;
  q: Record<string, string | undefined>;
  basePath: string;
  fields: Field[];
  classes?: { id: string; label: string }[];
  schools?: { id: string; name: string }[];
  blocks?: string[];
  exportHref?: string;
}) {
  const label = (text: string, child: React.ReactNode) => (
    <label className="block">
      <span className="text-xs font-medium text-ink-muted">{text}</span>
      {child}
    </label>
  );
  const select = (name: string, options: { value: string; label: string }[]) => (
    <Select name={name} defaultValue={q[name] ?? ""}>
      <option value="">{t("common.all")}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
  return (
    <Card className="mb-4">
      <form method="get" role="search" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {fields.includes("block") && label(t("common.block"), select("block", blocks.map((b) => ({ value: b, label: b }))))}
        {fields.includes("school") && label(t("common.school"), select("school", schools.map((s) => ({ value: s.id, label: s.name }))))}
        {fields.includes("class") && label(t("common.class"), select("class", classes.map((c) => ({ value: c.id, label: c.label }))))}
        {fields.includes("section") && label(t("common.section"), select("section", ["A", "B"].map((s) => ({ value: s, label: s }))))}
        {fields.includes("language") && label(t("common.language"), select("language", LANGUAGES.map((l) => ({ value: l, label: t(`lang.${l}`) }))))}
        {fields.includes("channel") && label(t("common.channel"), select("channel", CHANNELS.map((c) => ({ value: c, label: t(`channel.${c}`) }))))}
        {fields.includes("category") && label(t("common.category"), select("category", NOTICE_CATEGORIES.map((c) => ({ value: c, label: t(`category.${c}`) }))))}
        {fields.includes("status") && label(t("common.status"), select("status", DELIVERY_FILTER_STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }))))}
        {fields.includes("from") && label(t("common.from"), <Input type="date" name="from" defaultValue={q.from} />)}
        {fields.includes("to") && label(t("common.to"), <Input type="date" name="to" defaultValue={q.to} />)}
        <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-4 xl:col-span-6">
          <Button type="submit">{t("common.apply")}</Button>
          <LinkButton href={basePath} variant="ghost">
            {t("common.clear")}
          </LinkButton>
          {exportHref && (
            <a href={exportHref} className="ml-auto inline-flex min-h-11 items-center rounded-md border border-navy-200 bg-white px-4 text-sm font-medium text-navy-700 hover:bg-navy-50" download>
              {t("common.export")}
            </a>
          )}
        </div>
      </form>
    </Card>
  );
}

/** Rebuild a query string from current filters, dropping empty values. */
export function queryString(q: Record<string, string | undefined>, extra: Record<string, string> = {}): string {
  const entries = Object.entries({ ...q, ...extra }).filter(([, v]) => v !== undefined && v !== "") as [string, string][];
  return new URLSearchParams(entries).toString();
}
