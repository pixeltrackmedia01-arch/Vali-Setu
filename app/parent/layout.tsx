import Link from "next/link";
import { Inbox, Settings } from "lucide-react";
import { LanguageSwitcher, LogoutButton } from "@/components/layout/client-bits";
import { Wordmark } from "@/components/layout/Wordmark";
import { requireUser } from "@/lib/auth/guard";
import { isDemoMode } from "@/lib/env";
import { getT } from "@/lib/i18n/server";

/** Mobile-first shell for parents: large touch targets, minimal chrome, bottom navigation. */
export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  await requireUser(["PARENT"]);
  const { t } = await getT();
  return (
    <div className="min-h-screen pb-20">
      <a href="#main" className="skip-link">
        {t("app.skip")}
      </a>
      {isDemoMode() && (
        <div className="bg-warn-100 px-4 py-1 text-center text-xs font-medium text-warn-700" role="note">
          {t("app.demoBanner")}
        </div>
      )}
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-xl items-center gap-2 px-4 py-2">
          <Link href="/parent/messages" aria-label={t("parent.home")}>
            <Wordmark />
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <LanguageSwitcher compact />
            <LogoutButton className="px-2" />
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto max-w-xl px-4 py-4">
        {children}
      </main>
      <nav className="fixed inset-x-0 bottom-0 border-t border-line bg-white" aria-label={t("common.menu")}>
        <div className="mx-auto grid max-w-xl grid-cols-2">
          <Link href="/parent/messages" className="flex min-h-16 flex-col items-center justify-center gap-1 text-sm text-navy-700">
            <Inbox className="h-6 w-6" aria-hidden />
            {t("nav.messages")}
          </Link>
          <Link href="/parent/preferences" className="flex min-h-16 flex-col items-center justify-center gap-1 text-sm text-navy-700">
            <Settings className="h-6 w-6" aria-hidden />
            {t("nav.preferences")}
          </Link>
        </div>
      </nav>
    </div>
  );
}
