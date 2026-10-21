import { Info } from "lucide-react";
import type { Translator } from "@/lib/i18n";

/** Definitions shown beside every dashboard so rates are never presented without how they were computed. */
export function Methodology({ t, extra }: { t: Translator; extra?: string }) {
  return (
    <details className="mt-6 rounded-lg border border-line bg-white p-4 text-sm">
      <summary className="flex cursor-pointer items-center gap-2 font-medium text-navy-700">
        <Info className="h-4 w-4" aria-hidden /> {t("region.methodology")}
      </summary>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-ink-muted">
        {(["delivery", "ack", "events", "demo"] as const).map((k) => (
          <li key={k}>{t(`region.method.${k}`)}</li>
        ))}
        {extra && <li>{extra}</li>}
        <li>{t("region.notRanking")}</li>
      </ul>
    </details>
  );
}
