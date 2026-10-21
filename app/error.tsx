"use client";

import { Button } from "@/components/ui";
import { useI18n } from "@/lib/i18n/client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const { t } = useI18n();
  return (
    <main id="main" className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="text-2xl">{t("common.error")}</h1>
      <Button className="mt-6" onClick={reset}>
        {t("common.retry")}
      </Button>
    </main>
  );
}
