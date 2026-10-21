"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { api } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/client";

export function DemoAccountList({ accounts, switcher }: { accounts: { email: string; name: string; roleLabel: string }[]; switcher: boolean }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState<string | null>(null);

  function fill(email: string) {
    const input = document.getElementById("email") as HTMLInputElement | null;
    if (input) {
      input.value = email;
      document.getElementById("password")?.focus();
    }
  }

  async function quick(email: string) {
    setBusy(email);
    try {
      const res = await api<{ redirectTo: string }>("/api/auth/switch", { body: { email } });
      window.location.href = res.redirectTo;
    } catch {
      setBusy(null);
    }
  }

  return (
    <>
      <ul className="mt-4 divide-y divide-line">
        {accounts.map((a) => (
          <li key={a.email} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-medium">{a.roleLabel}</p>
              <p className="truncate text-xs text-ink-muted">
                {a.name} · <span className="font-mono">{a.email}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => fill(a.email)}>
                {t("login.useAccount")}
              </Button>
              {switcher && (
                <Button size="sm" variant="ghost" loading={busy === a.email} onClick={() => quick(a.email)} aria-label={`${t("login.quickSwitch")}: ${a.roleLabel}`}>
                  →
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {switcher && <p className="mt-3 text-xs text-ink-faint">{t("login.quickSwitch")}: →</p>}
    </>
  );
}
