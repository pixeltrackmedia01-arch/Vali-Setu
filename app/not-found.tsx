import { LinkButton } from "@/components/ui";
import { getT } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getT();
  return (
    <main id="main" className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="text-2xl">404</h1>
      <p className="mt-3 text-ink-muted">{t("errors.notFound")}</p>
      <LinkButton href="/" className="mt-6">
        {t("errors.goHome")}
      </LinkButton>
    </main>
  );
}
