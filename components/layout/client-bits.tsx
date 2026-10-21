"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import {
  BarChart3,
  Check,
  Clock,
  Download,
  FileText,
  History,
  Home,
  Layers,
  LogOut,
  Menu,
  MessageSquare,
  Plus,
  School,
  Settings,
  Users,
  X,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { LANGUAGES, type Language } from "@/lib/domain/constants";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import type { NavItem } from "./nav";

const ICONS = { home: Home, plus: Plus, file: FileText, clock: Clock, check: Check, history: History, message: MessageSquare, settings: Settings, chart: BarChart3, users: Users, school: School, layers: Layers, download: Download };

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className={compact ? "sr-only" : "text-ink-muted"}>{t("lang.label")}</span>
      <select
        aria-label={t("lang.change")}
        className="min-h-10 rounded-md border border-line bg-white px-2 text-sm"
        value={locale}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as Language;
          start(async () => {
            await api("/api/locale", { body: { locale: next } }).catch(() => undefined);
            router.refresh();
          });
        }}
      >
        {LANGUAGES.map((l) => (
          <option key={l} value={l} lang={l}>
            {t(`lang.${l}`)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function LogoutButton({ className }: { className?: string }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className={cn("inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm text-navy-700 hover:bg-navy-50", className)}
      disabled={pending}
      onClick={() =>
        start(async () => {
          await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
          window.location.href = "/login";
        })
      }
    >
      <LogOut className="h-4 w-4" aria-hidden />
      {t("common.signOut")}
    </button>
  );
}

function isActive(item: NavItem, pathname: string, status: string | null) {
  const [path, query] = item.href.split("?");
  if (pathname !== path && !(path !== "/teacher/notices" && pathname.startsWith(`${path}/`))) return false;
  const wanted = new URLSearchParams(query ?? "").get("status");
  return wanted === status || (!wanted && !status);
}

export function SideNav({ items, mode }: { items: NavItem[]; mode: "mobile" | "desktop" }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const status = useSearchParams().get("status");
  const [open, setOpen] = useState(false);
  const list = (
    <ul className="space-y-1">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = isActive(item, pathname, status);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm",
                active ? "bg-navy-600 font-semibold text-white" : "text-ink hover:bg-navy-50",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {t(item.label)}
            </Link>
          </li>
        );
      })}
    </ul>
  );
  if (mode === "desktop") {
    return <nav aria-label={t("common.menu")}>{list}</nav>;
  }
  return (
    <>
      <button
        type="button"
        className="inline-flex min-h-10 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm lg:hidden"
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <X className="h-4 w-4" aria-hidden /> : <Menu className="h-4 w-4" aria-hidden />}
        {t("common.menu")}
      </button>
      {open && (
        <nav id="mobile-nav" aria-label={t("common.menu")} className="absolute inset-x-0 top-full z-30 border-b border-line bg-white p-3 shadow lg:hidden">
          {list}
        </nav>
      )}
    </>
  );
}
