import Link from "next/link";
import { Suspense } from "react";
import { Bell } from "lucide-react";
import type { SessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { ACADEMIC_YEAR } from "@/lib/domain/constants";
import { getT } from "@/lib/i18n/server";
import { can, noticeScope } from "@/lib/permissions";
import { isDemoMode } from "@/lib/env";
import { LanguageSwitcher, LogoutButton, SideNav } from "./client-bits";
import { NAV } from "./nav";
import { Wordmark } from "./Wordmark";

async function attentionCount(user: SessionUser): Promise<{ count: number; href: string }> {
  if (user.role === "TEACHER" || user.role === "HEAD_TEACHER" || user.role === "SCHOOL_ADMIN") {
    const scope = noticeScope(user);
    const [pending, questions] = await Promise.all([
      can(user, "notice.approve") ? db.notice.count({ where: { AND: [scope, { workflowStatus: "PENDING_APPROVAL" }] } }) : Promise.resolve(0),
      db.parentResponse.count({ where: { notice: scope, responseType: "QUESTION", status: "OPEN" } }),
    ]);
    const responsesHref = user.role === "SCHOOL_ADMIN" ? "/school/responses" : "/teacher/responses";
    return { count: pending + questions, href: pending > 0 ? "/teacher/notices?status=PENDING_APPROVAL" : responsesHref };
  }
  return { count: 0, href: "#" };
}

export async function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const { t } = await getT();
  if (user.role === "PARENT") return <>{children}</>;
  const items = NAV[user.role];
  const school = user.schoolId ? await db.school.findUnique({ where: { id: user.schoolId }, select: { name: true } }) : null;
  const scopeLabel = school?.name ?? (user.role === "DISTRICT_OFFICIAL" ? user.district : user.role === "CRC_OFFICER" ? `${user.cluster}, ${user.block}` : user.block);
  const attention = await attentionCount(user);

  return (
    <div className="min-h-screen">
      <a href="#main" className="skip-link">
        {t("app.skip")}
      </a>
      {isDemoMode() && (
        <div className="bg-warn-100 px-4 py-1.5 text-center text-xs font-medium text-warn-700" role="note">
          {t("app.demoBanner")}
        </div>
      )}
      <header className="relative border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-3" aria-label={t("app.name")}>
            <Wordmark />
          </Link>
          <div className="hidden min-w-0 border-l border-line pl-3 text-sm md:block">
            <p className="truncate font-medium text-ink">{scopeLabel}</p>
            <p className="text-xs text-ink-muted">{t("app.academicYear", { year: ACADEMIC_YEAR })}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitcher compact />
            {attention.count > 0 ? (
              <Link
                href={attention.href}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-navy-50"
                aria-label={t("common.notificationsCount", { count: attention.count })}
              >
                <Bell className="h-5 w-5 text-navy-700" aria-hidden />
                <span className="absolute right-1 top-1 rounded-full bg-danger-600 px-1.5 text-[11px] font-semibold leading-4 text-white">{attention.count}</span>
              </Link>
            ) : (
              <span className="inline-flex h-10 w-10 items-center justify-center" title={t("common.notifications")}>
                <Bell className="h-5 w-5 text-ink-faint" aria-label={t("common.notifications")} />
              </span>
            )}
            <div className="hidden text-right text-sm sm:block">
              <p className="font-medium leading-tight">{user.name}</p>
              <p className="text-xs text-ink-muted">{t(`roles.${user.role}`)}</p>
            </div>
            <LogoutButton />
            <Suspense>
              <SideNav items={items} mode="mobile" />
            </Suspense>
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-[1400px] gap-6 px-4 py-6">
        <aside className="hidden w-60 shrink-0 lg:block">
          <Suspense>
            <SideNav items={items} mode="desktop" />
          </Suspense>
          <p className="mt-8 px-3 text-xs text-ink-faint">{t("app.prototypeNote")}</p>
        </aside>
        <main id="main" className="min-w-0 flex-1" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
