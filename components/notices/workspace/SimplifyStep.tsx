"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Alert, Badge, Button, Card, CardHeader, LinkButton, Textarea } from "@/components/ui";
import { api } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/client";
import { useAction } from "./useAction";

export function SimplifyStep({
  noticeId,
  sourceText,
  simplifiedText,
  simplifiedBy,
  editable,
}: {
  noticeId: string;
  sourceText: string;
  simplifiedText: string | null;
  simplifiedBy: string | null;
  editable: boolean;
}) {
  const { t } = useI18n();
  const { busy, feedback, run } = useAction();
  const [text, setText] = useState(simplifiedText ?? "");
  const [synced, setSynced] = useState(simplifiedText ?? "");
  // Pick up server changes (e.g. after "Simplify again") without clobbering unsaved typing.
  if ((simplifiedText ?? "") !== synced) {
    setSynced(simplifiedText ?? "");
    setText(simplifiedText ?? "");
  }
  const dirty = text !== (simplifiedText ?? "");

  const origin = !simplifiedBy
    ? null
    : simplifiedBy === "manual"
      ? t("wizard.simplify.manual")
      : simplifiedBy.startsWith("simulated:curated")
        ? t("wizard.simplify.simulatedSample")
        : simplifiedBy.startsWith("simulated")
          ? t("wizard.simplify.simulatedRule")
          : t("wizard.simplify.live", { provider: simplifiedBy.replace(/^live:/, "") });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader title={t("wizard.simplify.original")} level={3} />
        <p className="whitespace-pre-wrap rounded-md bg-gray-50 p-3 text-sm leading-relaxed">{sourceText}</p>
      </Card>
      <Card>
        <CardHeader
          title={t("wizard.simplify.simplified")}
          description={t("wizard.simplify.help")}
          level={3}
          actions={
            editable && (
              <Button
                variant="secondary"
                size="sm"
                loading={busy === "simplify"}
                onClick={() => run("simplify", () => api(`/api/notices/${noticeId}/simplify`, { method: "POST" }))}
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                {simplifiedText ? t("wizard.simplify.regenerate") : t("wizard.simplify.action")}
              </Button>
            )
          }
        />
        {origin && (
          <p className="mb-2">
            <Badge tone={simplifiedBy === "manual" ? "info" : "warn"}>{origin}</Badge>
          </p>
        )}
        {feedback && <Alert tone={feedback.tone} className="mb-3">{feedback.text}</Alert>}
        <label htmlFor="simplified" className="sr-only">
          {t("wizard.simplify.simplified")}
        </label>
        <Textarea
          id="simplified"
          rows={10}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("wizard.simplify.empty")}
          readOnly={!editable}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          {editable && simplifiedText ? (
            <Button
              variant="ghost"
              size="sm"
              loading={busy === "clear"}
              onClick={() => run("clear", () => api(`/api/notices/${noticeId}`, { method: "PATCH", body: { simplifiedText: null } }))}
            >
              {t("wizard.simplify.useOriginal")}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            {editable && (
              <Button
                variant="secondary"
                disabled={!dirty || !text.trim()}
                loading={busy === "save"}
                onClick={() => run("save", () => api(`/api/notices/${noticeId}`, { method: "PATCH", body: { simplifiedText: text } }), t("wizard.saved"))}
              >
                {t("common.save")}
              </Button>
            )}
            <LinkButton href={`/notices/${noticeId}?step=translate`} aria-disabled={dirty}>
              {t("common.next")}
            </LinkButton>
          </div>
        </div>
        {dirty && <p className="mt-2 text-sm text-warn-700">{t("wizard.unsaved")}</p>}
      </Card>
    </div>
  );
}
