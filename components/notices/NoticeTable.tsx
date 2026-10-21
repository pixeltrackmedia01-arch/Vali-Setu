import Link from "next/link";
import { EmptyState, Table, Td, Th } from "@/components/ui";
import type { Translator } from "@/lib/i18n";
import { formatDate, splitList } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";

export interface NoticeRow {
  id: string;
  title: string;
  category: string;
  workflowStatus: string;
  priority: string;
  targetLanguages: string;
  createdAt: Date;
  dispatchedAt: Date | null;
  classes: string;
  recipients: number;
  acknowledged: number;
}

export function NoticeTable({ rows, t, locale }: { rows: NoticeRow[]; t: Translator; locale: string }) {
  if (rows.length === 0) return <EmptyState title={t("common.noResults")} />;
  return (
    <Table caption={t("teacher.recent")}>
      <thead>
        <tr>
          <Th>{t("teacher.col.title")}</Th>
          <Th>{t("teacher.col.classes")}</Th>
          <Th>{t("teacher.col.created")}</Th>
          <Th>{t("teacher.col.languages")}</Th>
          <Th>{t("teacher.col.approval")}</Th>
          <Th>{t("teacher.col.dispatch")}</Th>
          <Th>{t("teacher.col.ack")}</Th>
          <Th>
            <span className="sr-only">{t("common.actions")}</span>
          </Th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {rows.map((n) => (
          <tr key={n.id} className="hover:bg-canvas">
            <Td className="min-w-56">
              <Link href={`/notices/${n.id}`} className="font-medium text-navy-700 underline-offset-2 hover:underline">
                {n.title}
              </Link>
              <p className="text-xs text-ink-muted">
                {t(`category.${n.category}` as never)}
                {n.priority !== "NORMAL" && (
                  <>
                    {" · "}
                    <span className={n.priority === "URGENT" ? "text-danger-700" : "text-warn-700"}>{t(`priority.${n.priority}` as never)}</span>
                  </>
                )}
              </p>
            </Td>
            <Td>{n.classes}</Td>
            <Td className="whitespace-nowrap">{formatDate(n.createdAt, locale)}</Td>
            <Td className="whitespace-nowrap">{splitList(n.targetLanguages).map((l) => t(`lang.${l}` as never)).join(", ")}</Td>
            <Td>
              <StatusBadge status={n.workflowStatus === "DISPATCHED" ? "APPROVED" : n.workflowStatus} label={t(`status.${n.workflowStatus === "DISPATCHED" ? "APPROVED" : n.workflowStatus}` as never)} />
            </Td>
            <Td className="whitespace-nowrap">
              {n.dispatchedAt ? (
                <StatusBadge status="DISPATCHED" label={`${t("status.DISPATCHED")} ${formatDate(n.dispatchedAt, locale)}`} />
              ) : n.workflowStatus === "SCHEDULED" ? (
                <StatusBadge status="SCHEDULED" label={t("status.SCHEDULED")} />
              ) : (
                <span className="text-ink-faint">{t("teacher.notDispatched")}</span>
              )}
            </Td>
            <Td className="whitespace-nowrap tabular-nums">{n.dispatchedAt ? t("teacher.ackSummary", { ack: n.acknowledged, total: n.recipients }) : "—"}</Td>
            <Td>
              <Link href={`/notices/${n.id}`} className="text-sm text-navy-700 hover:underline" aria-label={`${t("common.open")}: ${n.title}`}>
                {t("common.open")}
              </Link>
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
