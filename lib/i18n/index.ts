import { en } from "./messages/en";
import { gu } from "./messages/gu";
import { hi } from "./messages/hi";
import type { Language } from "@/lib/domain/constants";

type DeepString<T> = { [K in keyof T]: T[K] extends string ? string : DeepString<T[K]> };
export type Messages = DeepString<typeof en>;
export const DICTIONARIES: Record<Language, Messages> = { en, gu, hi };
export const LOCALE_COOKIE = "vs_locale";

type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];
export type MessageKey = Leaves<typeof en>;

export type Translator = (key: MessageKey, vars?: Record<string, string | number>) => string;

function lookup(dict: unknown, key: string): string | undefined {
  let node: unknown = dict;
  for (const part of key.split(".")) {
    if (node && typeof node === "object" && part in node) node = (node as Record<string, unknown>)[part];
    else return undefined;
  }
  return typeof node === "string" ? node : undefined;
}

export function createTranslator(locale: Language): Translator {
  return translatorFor(DICTIONARIES[locale]);
}

/** Dictionaries are type-checked to be complete, so no fallback language is needed. */
export function translatorFor(dict: Messages): Translator {
  return (key, vars) => {
    const template = lookup(dict, key) ?? key;
    if (!vars) return template;
    return template.replace(/\{(\w+)\}/g, (_, name: string) => (name in vars ? String(vars[name]) : `{${name}}`));
  };
}
