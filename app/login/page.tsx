import { redirect } from "next/navigation";
import { Wordmark } from "@/components/layout/Wordmark";
import { LanguageSwitcher } from "@/components/layout/client-bits";
import { getCurrentUser } from "@/lib/auth/session";
import { DEMO_ACCOUNTS, demoPassword, demoSwitcherEnabled } from "@/lib/auth/demo";
import { isDemoMode } from "@/lib/env";
import { getT } from "@/lib/i18n/server";
import { ROLE_HOME } from "@/lib/permissions";
import { DemoAccountList } from "./DemoAccountList";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ expired?: string; next?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect(ROLE_HOME[user.role]);
  const { t } = await getT();
  const q = await searchParams;
  const password = demoPassword();
  const accounts = isDemoMode() ? DEMO_ACCOUNTS.map((a) => ({ ...a, roleLabel: t(`roles.${a.role}`) })) : [];

  return (
    <div className="min-h-screen">
      {isDemoMode() && (
        <div className="bg-warn-100 px-4 py-1.5 text-center text-xs font-medium text-warn-700" role="note">
          {t("app.demoBanner")}
        </div>
      )}
      <main id="main" className="mx-auto grid max-w-5xl gap-8 px-4 py-10 md:grid-cols-[1fr_1.1fr] md:py-16">
        <section>
          <div className="flex items-center justify-between">
            <Wordmark size="lg" />
            <LanguageSwitcher compact />
          </div>
          <p className="mt-6 text-lg font-medium text-navy-800">{t("app.tagline")}</p>
          <p className="mt-1 text-navy-700" lang="gu">
            {t("app.taglineGu")}
          </p>
          <div className="mt-8 rounded-lg border border-line bg-white p-5 shadow-card">
            <h1 className="text-xl">{t("login.title")}</h1>
            <p className="mt-1 text-sm text-ink-muted">{t("login.subtitle")}</p>
            <LoginForm expired={q.expired === "1"} next={q.next} />
          </div>
          <p className="mt-6 text-xs text-ink-faint">{t("app.org")}</p>
          <p className="mt-1 text-xs text-ink-faint">{t("app.prototypeNote")}</p>
        </section>
        {accounts.length > 0 && (
          <section aria-labelledby="demo-accounts" className="rounded-lg border border-line bg-white p-5 shadow-card">
            <h2 id="demo-accounts" className="text-lg">
              {t("login.demoTitle")}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">{t("login.demoText")}</p>
            {password && <p className="mt-2 rounded bg-navy-50 px-3 py-2 font-mono text-sm text-navy-800">{t("login.demoPassword", { password })}</p>}
            <DemoAccountList accounts={accounts} switcher={demoSwitcherEnabled()} />
          </section>
        )}
      </main>
    </div>
  );
}
