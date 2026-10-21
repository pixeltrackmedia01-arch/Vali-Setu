"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { StatusBadge } from "@/components/notices/StatusBadge";
import { Alert, Button, Card, CardHeader, Input, LinkButton, Table, Td, Th } from "@/components/ui";
import { api } from "@/lib/api/client";
import { LANGUAGE_LOCALE, isLanguage } from "@/lib/domain/constants";
import { useI18n } from "@/lib/i18n/client";
import { isBlocking, requiresOverride } from "@/services/validation/compare";
import { useAction } from "./useAction";

export interface ValidationRowView {
  id: string;
  fieldType: string;
  sourceValue: string;
  translatedValue: string | null;
  status: string;
  critical: boolean;
  resolution: string;
  reviewNote: string | null;
}

export interface ValidationGroup {
  target: string;
  current: boolean;
  rows: ValidationRowView[];
}

export function ValidationPanel({
  noticeId,
  groups,
  canRun,
  canReview,
  canOverride,
}: {
  noticeId: string;
  groups: ValidationGroup[];
  canRun: boolean;
  canReview: boolean;
  canOverride: boolean;
}) {
  const { t } = useI18n();
  const { busy, feedback, run } = useAction();
  const [overriding, setOverriding] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const anyRun = groups.some((g) => g.rows.length > 0);
  const stale = groups.some((g) => !g.current);
  const blocking = groups.filter((g) => g.target !== "simplified").flatMap((g) => g.rows).filter(isBlocking).length;

  const resolve = (validationId: string, resolution: "REVIEWED" | "OVERRIDDEN" | "OPEN", note?: string) =>
    run(resolution, () => api(`/api/notices/${noticeId}/validations`, { method: "PATCH", body: { validationId, resolution, note } }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title={t("wizard.steps.validate")}
          description={t("wizard.validate.intro")}
          actions={
            canRun && (
              <Button loading={busy === "run"} onClick={() => run("run", () => api(`/api/notices/${noticeId}/validate`, { method: "POST" }))}>
                <ShieldCheck className="h-4 w-4" aria-hidden />
                {anyRun ? t("wizard.validate.rerun") : t("wizard.validate.run")}
              </Button>
            )
          }
        />
        {feedback && <Alert tone={feedback.tone} className="mb-3">{feedback.text}</Alert>}
        {!anyRun || stale ? (
          <Alert tone="warn">{t("wizard.validate.notRun")}</Alert>
        ) : blocking > 0 ? (
          <Alert tone="danger">{t("wizard.validate.blocking", { count: blocking })}</Alert>
        ) : (
          <Alert tone="success">{t("wizard.validate.allClear")}</Alert>
        )}
      </Card>

      {groups
        .filter((g) => g.rows.length > 0)
        .map((group) => (
          <Card key={group.target}>
            <CardHeader
              level={3}
              title={t(`wizard.validate.target.${group.target as "gu"}`)}
              actions={
                isLanguage(group.target) && canReview ? (
                  <LinkButton variant="secondary" size="sm" href={`/notices/${noticeId}?step=translate&lang=${group.target}`}>
                    {t("wizard.validate.fix")}
                  </LinkButton>
                ) : undefined
              }
            />
            <Table caption={t(`wizard.validate.target.${group.target as "gu"}`)}>
              <thead>
                <tr>
                  <Th>{t("wizard.validate.col.detail")}</Th>
                  <Th>{t("wizard.validate.col.original")}</Th>
                  <Th>{t("wizard.validate.col.version")}</Th>
                  <Th>{t("wizard.validate.col.status")}</Th>
                  <Th>{t("wizard.validate.col.action")}</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {group.rows.map((row) => {
                  const blocked = isBlocking(row);
                  const needsOverride = row.critical && requiresOverride(row.status);
                  return (
                    <tr key={row.id} className={blocked ? "bg-danger-50/60" : undefined}>
                      <Td className="font-medium">
                        {t(`wizard.validate.fieldTypes.${row.fieldType as "date"}`)}
                      </Td>
                      <Td>{row.sourceValue}</Td>
                      <Td>
                        <span lang={isLanguage(group.target) ? LANGUAGE_LOCALE[group.target] : undefined}>
                          {row.translatedValue ?? <span className="text-danger-700">{t("wizard.validate.notFound")}</span>}
                        </span>
                      </Td>
                      <Td>
                        <div className="flex flex-col items-start gap-1">
                          <StatusBadge status={row.status} label={t(`wizard.validate.statuses.${row.status as "MATCHED"}`)} />
                          {row.resolution !== "OPEN" && (
                            <StatusBadge
                              status={row.resolution === "OVERRIDDEN" ? "HIGH" : "DONE"}
                              label={row.resolution === "OVERRIDDEN" ? t("wizard.validate.overridden") : t("wizard.validate.reviewedBy")}
                            />
                          )}
                          {row.status !== "MATCHED" && row.reviewNote && <p className="max-w-xs text-xs text-ink-muted">{row.reviewNote}</p>}
                        </div>
                      </Td>
                      <Td>
                        <div className="flex flex-wrap gap-1">
                          {row.status !== "MATCHED" && row.resolution === "OPEN" && !needsOverride && canReview && (
                            <Button size="sm" variant="secondary" loading={busy === "REVIEWED"} onClick={() => resolve(row.id, "REVIEWED")}>
                              {t("wizard.validate.markReviewed")}
                            </Button>
                          )}
                          {needsOverride && row.resolution === "OPEN" && canOverride && (
                            <Button size="sm" variant="ghost" onClick={() => { setOverriding(row.id); setReason(""); }} aria-expanded={overriding === row.id}>
                              {t("wizard.validate.override")}
                            </Button>
                          )}
                          {row.resolution !== "OPEN" && canReview && (
                            <Button size="sm" variant="ghost" loading={busy === "OPEN"} onClick={() => resolve(row.id, "OPEN")}>
                              {t("wizard.validate.reopen")}
                            </Button>
                          )}
                        </div>
                        {overriding === row.id && (
                          <form
                            className="mt-2 space-y-2 rounded-md border border-warn-100 bg-warn-50 p-2"
                            onSubmit={async (e) => {
                              e.preventDefault();
                              await resolve(row.id, "OVERRIDDEN", reason);
                              setOverriding(null);
                            }}
                          >
                            <p className="text-xs text-warn-700">{t("wizard.validate.overrideHint")}</p>
                            <label htmlFor={`ov-${row.id}`} className="block text-xs font-medium">
                              {t("wizard.validate.overrideReason")}
                            </label>
                            <Input id={`ov-${row.id}`} value={reason} onChange={(e) => setReason(e.target.value)} minLength={10} maxLength={500} required />
                            <div className="flex gap-2">
                              <Button type="submit" size="sm" variant="danger" disabled={reason.trim().length < 10} loading={busy === "OVERRIDDEN"}>
                                {t("wizard.validate.confirmOverride")}
                              </Button>
                              <Button type="button" size="sm" variant="ghost" onClick={() => setOverriding(null)}>
                                {t("common.cancel")}
                              </Button>
                            </div>
                          </form>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Card>
        ))}
      <div className="flex justify-end">
        <LinkButton href={`/notices/${noticeId}?step=audio`}>{t("common.next")}</LinkButton>
      </div>
    </div>
  );
}
