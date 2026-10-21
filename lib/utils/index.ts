import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { DISPLAY_TIMEZONE } from "@/lib/domain/constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function splitList(value: string | null | undefined): string[] {
  return (value ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

/** Show only the last digits of a phone number. */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  return digits.length <= 4 ? "••••" : `••••• ••${digits.slice(-3)}`;
}

const LOCALE_TAG: Record<string, string> = { en: "en-IN", gu: "gu-IN", hi: "hi-IN" };

export function formatDate(date: Date | string | null | undefined, locale = "en", withTime = false): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(LOCALE_TAG[locale] ?? "en-IN", {
    timeZone: DISPLAY_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(d);
}

export function percent(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export function safeJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
