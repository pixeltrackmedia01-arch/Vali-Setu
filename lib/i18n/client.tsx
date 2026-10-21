"use client";

import { createContext, useContext, useMemo } from "react";
import type { Language } from "@/lib/domain/constants";
import type { Messages, Translator } from "./index";

const I18nContext = createContext<{ locale: Language; t: Translator } | null>(null);

function lookup(dict: unknown, key: string): string | undefined {
  let node: unknown = dict;
  for (const part of key.split(".")) {
    if (node && typeof node === "object" && part in node) node = (node as Record<string, unknown>)[part];
    else return undefined;
  }
  return typeof node === "string" ? node : undefined;
}

/** Receives only the active dictionary from the server, keeping client bundles small. */
export function I18nProvider({ locale, messages, children }: { locale: Language; messages: Messages; children: React.ReactNode }) {
  const value = useMemo(() => {
    const t: Translator = (key, vars) => {
      const template = lookup(messages, key) ?? key;
      if (!vars) return template;
      return template.replace(/\{(\w+)\}/g, (_, name: string) => (name in vars ? String(vars[name]) : `{${name}}`));
    };
    return { locale, t };
  }, [locale, messages]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
