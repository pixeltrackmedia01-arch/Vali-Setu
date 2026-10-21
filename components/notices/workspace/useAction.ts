"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { errorText } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/client";

export type Feedback = { tone: "success" | "danger" | "info" | "warn"; text: string; details?: unknown } | null;

/**
 * Runs one server mutation at a time for a workspace step: tracks which action
 * is busy, shows a localised error, and refreshes server data on success.
 */
export function useAction() {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function run<T>(name: string, fn: () => Promise<T>, success?: string): Promise<T | undefined> {
    setBusy(name);
    setFeedback(null);
    try {
      const result = await fn();
      if (success) setFeedback({ tone: "success", text: success });
      router.refresh();
      return result;
    } catch (err) {
      setFeedback({ tone: "danger", text: errorText(err, t), details: (err as { details?: unknown }).details });
      return undefined;
    } finally {
      setBusy(null);
    }
  }

  return { busy, feedback, setFeedback, run };
}
