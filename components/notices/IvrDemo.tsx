"use client";

import { useState } from "react";
import { PhoneCall } from "lucide-react";
import { Button } from "@/components/ui";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

const STEPS = ["initiated", "answered", "intro", "spoken", "repeat", "confirm", "complete", "followUp"] as const;

/** Walks through the simulated voice-call journey one step at a time. Nothing is dialled. */
export function IvrDemo({ school, spoken, lang }: { school: string; spoken: string; lang: string }) {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  return (
    <div>
      <ol className="space-y-2" aria-live="polite">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={cn(
              "rounded-md border p-3 text-sm transition-colors",
              i < step ? "border-success-100 bg-success-50" : i === step ? "border-navy-600 bg-navy-50" : "border-line bg-white text-ink-faint",
            )}
            aria-current={i === step ? "step" : undefined}
          >
            <p className="flex items-center gap-2 font-medium">
              <PhoneCall className="h-4 w-4" aria-hidden />
              {i + 1}. {t(`basicPhone.steps.${s}`)}
            </p>
            {i <= step && (
              <p className="mt-1 text-ink-muted">
                {t(`basicPhone.stepText.${s}`, { school })}
                {s === "spoken" && (
                  <span lang={lang} className="mt-1 block rounded bg-white p-2 text-ink">
                    {spoken}
                  </span>
                )}
                {(s === "repeat" || s === "confirm") && <span className="mt-1 block text-xs">{t("basicPhone.keypad")}</span>}
              </p>
            )}
          </li>
        ))}
      </ol>
      <div className="mt-3 flex gap-2">
        <Button onClick={() => setStep((n) => Math.min(n + 1, STEPS.length - 1))} disabled={step === STEPS.length - 1}>
          {t("basicPhone.nextStep")}
        </Button>
        <Button variant="ghost" onClick={() => setStep(0)}>
          {t("basicPhone.restart")}
        </Button>
      </div>
    </div>
  );
}
