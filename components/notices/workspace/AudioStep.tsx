"use client";

import { Mic } from "lucide-react";
import { AudioPlayer } from "@/components/audio/AudioPlayer";
import { Alert, Badge, Button, Card, CardHeader, LinkButton } from "@/components/ui";
import { api } from "@/lib/api/client";
import { LANGUAGE_LOCALE, LANGUAGE_NATIVE_NAME, type Language } from "@/lib/domain/constants";
import { useI18n } from "@/lib/i18n/client";
import { useAction } from "./useAction";

export interface AudioItem {
  language: Language;
  hasTranslation: boolean;
  text: string;
  audio: { id: string; status: string; provider: string; durationSeconds: number | null; stale: boolean; spokenText: string } | null;
}

export function AudioStep({ noticeId, items, voiceRequired, editable }: { noticeId: string; items: AudioItem[]; voiceRequired: boolean; editable: boolean }) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <Alert tone="info">
        {t("wizard.audio.intro")} {voiceRequired && <strong>{t("wizard.audio.requiredForVoice")}</strong>}
      </Alert>
      <div className="grid gap-4 xl:grid-cols-3">
        {items.map((item) => (
          <AudioCard key={item.language} noticeId={noticeId} item={item} editable={editable} />
        ))}
      </div>
      <div className="flex justify-end">
        <LinkButton href={`/notices/${noticeId}?step=review`}>{t("common.next")}</LinkButton>
      </div>
    </div>
  );
}

function AudioCard({ noticeId, item, editable }: { noticeId: string; item: AudioItem; editable: boolean }) {
  const { t } = useI18n();
  const { busy, feedback, run } = useAction();
  const { audio } = item;
  return (
    <Card>
      <CardHeader
        level={3}
        title={<span lang={LANGUAGE_LOCALE[item.language]}>{LANGUAGE_NATIVE_NAME[item.language]}</span>}
        actions={
          editable &&
          item.hasTranslation && (
            <Button
              size="sm"
              variant={audio && !audio.stale ? "secondary" : "primary"}
              loading={busy === "gen"}
              onClick={() => run("gen", () => api(`/api/notices/${noticeId}/audio`, { body: { language: item.language } }))}
            >
              <Mic className="h-4 w-4" aria-hidden />
              {audio ? t("wizard.audio.regenerate") : t("wizard.audio.generate")}
            </Button>
          )
        }
      />
      {feedback && <Alert tone={feedback.tone} className="mb-3">{feedback.text}</Alert>}
      {!item.hasTranslation ? (
        <p className="text-sm text-ink-muted">{t("wizard.audio.needTranslation")}</p>
      ) : !audio ? (
        <p className="text-sm text-ink-muted">{t("wizard.audio.none")}</p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {audio.stale ? (
              <Badge tone="warn">{t("wizard.audio.stale")}</Badge>
            ) : audio.status === "READY" ? (
              <Badge tone="success">{t("wizard.audio.ready")}</Badge>
            ) : audio.status === "FAILED" ? (
              <Badge tone="danger">{t("wizard.audio.failed")}</Badge>
            ) : (
              <Badge tone="warn">{t("common.simulated")}</Badge>
            )}
            {audio.durationSeconds ? <Badge>{t("wizard.audio.duration", { seconds: Math.round(audio.durationSeconds) })}</Badge> : null}
          </div>
          {audio.status === "READY" && !audio.stale ? (
            <>
              <AudioPlayer src={`/api/audio/${audio.id}`} labels={{ play: t("wizard.audio.play"), pause: t("wizard.audio.pause"), failed: t("wizard.audio.playbackFailed") }} />
              {audio.provider.startsWith("demo") && <p className="text-xs text-ink-muted">{t("wizard.audio.sample")}</p>}
            </>
          ) : audio.status === "SIMULATED" && !audio.stale ? (
            <p className="rounded-md bg-warn-50 p-3 text-sm text-warn-700">{t("wizard.audio.simulated")}</p>
          ) : null}
        </div>
      )}
      {item.hasTranslation && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-navy-700">{t("wizard.audio.spoken")}</summary>
          <p lang={LANGUAGE_LOCALE[item.language]} className="mt-2 whitespace-pre-wrap rounded-md bg-gray-50 p-3 leading-relaxed">
            {audio && !audio.stale ? audio.spokenText : item.text}
          </p>
        </details>
      )}
    </Card>
  );
}
