import Link from "next/link";
import { Check } from "lucide-react";
import type { Translator } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const STEPS = ["create", "simplify", "translate", "validate", "audio", "review"] as const;
export type Step = (typeof STEPS)[number];

export function isStep(value: unknown): value is Step {
  return typeof value === "string" && (STEPS as readonly string[]).includes(value);
}

/** Steps are links, so any step can be revisited; `done` marks steps whose output exists. */
export function Stepper({ noticeId, current, done, t }: { noticeId: string; current: Step; done: Partial<Record<Step, boolean>>; t: Translator }) {
  return (
    <nav aria-label={t("wizard.title")} className="mb-6 overflow-x-auto">
      <ol className="flex min-w-max gap-1 rounded-lg border border-line bg-white p-1">
        {STEPS.map((step, i) => {
          const active = step === current;
          return (
            <li key={step}>
              <Link
                href={`/notices/${noticeId}?step=${step}`}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium",
                  active ? "bg-navy-600 text-white" : "text-ink-muted hover:bg-navy-50 hover:text-navy-700",
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs",
                    active ? "border-white" : done[step] ? "border-success-600 bg-success-600 text-white" : "border-line",
                  )}
                  aria-hidden
                >
                  {done[step] && !active ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                {t(`wizard.steps.${step}`)}
                {done[step] && <span className="sr-only">✓</span>}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
