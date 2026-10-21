import { LinkButton } from "@/components/ui";
import { getT } from "@/lib/i18n/server";

export default async function Forbidden({ searchParams }: { searchParams: Promise<{ home?: string }> }) {
  const { t } = await getT();
  const { home } = await searchParams;
  const safeHome = home && home.startsWith("/") && !home.startsWith("//") ? home : "/";
  return (
    <main id="main" className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="text-2xl">403</h1>
      <p className="mt-3 text-ink-muted">{t("errors.forbidden")}</p>
      <LinkButton href={safeHome} className="mt-6">
        {t("errors.goHome")}
      </LinkButton>
    </main>
  );
}
