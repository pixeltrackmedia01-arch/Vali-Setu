/**
 * Normalisation helpers for comparing critical details across English,
 * Gujarati and Hindi text. Every helper keeps string length unchanged where it
 * rewrites characters, so match offsets still point into the original text and
 * the original script can always be shown back to the reviewer.
 */

const GUJARATI_ZERO = 0x0ae6;
const DEVANAGARI_ZERO = 0x0966;

/** Replace Gujarati (૦-૯) and Devanagari (०-९) digits with ASCII digits, 1:1. */
export function toLatinDigits(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (code >= GUJARATI_ZERO && code <= GUJARATI_ZERO + 9) {
      out += String(code - GUJARATI_ZERO);
    } else if (code >= DEVANAGARI_ZERO && code <= DEVANAGARI_ZERO + 9) {
      out += String(code - DEVANAGARI_ZERO);
    } else {
      out += ch;
    }
  }
  return out;
}

/** Render ASCII digits in the native numeral system for display. */
export function toScriptDigits(text: string, lang: "gu" | "hi" | "en"): string {
  if (lang === "en") return text;
  const zero = lang === "gu" ? GUJARATI_ZERO : DEVANAGARI_ZERO;
  return text.replace(/[0-9]/g, (d) => String.fromCodePoint(zero + Number(d)));
}

/** Month names by month number (1-12) in all supported scripts and common spellings. */
export const MONTH_NAMES: Record<number, string[]> = {
  1: ["january", "jan", "જાન્યુઆરી", "જાન્યુ", "जनवरी"],
  2: ["february", "feb", "ફેબ્રુઆરી", "ફેબ્રુ", "फ़रवरी", "फरवरी"],
  3: ["march", "mar", "માર્ચ", "मार्च"],
  4: ["april", "apr", "એપ્રિલ", "अप्रैल", "अप्रेल"],
  5: ["may", "મે", "मई"],
  6: ["june", "jun", "જૂન", "જુન", "जून"],
  7: ["july", "jul", "જુલાઈ", "જુલાઇ", "जुलाई"],
  8: ["august", "aug", "ઓગસ્ટ", "ઑગસ્ટ", "अगस्त"],
  9: ["september", "sept", "sep", "સપ્ટેમ્બર", "सितंबर", "सितम्बर"],
  10: ["october", "oct", "ઓક્ટોબર", "ઑક્ટોબર", "ઓક્ટો", "अक्टूबर", "अक्तूबर"],
  11: ["november", "nov", "નવેમ્બર", "नवंबर", "नवम्बर"],
  12: ["december", "dec", "ડિસેમ્બર", "दिसंबर", "दिसम्बर"],
};

const MONTH_LOOKUP = new Map<string, number>();
for (const [num, names] of Object.entries(MONTH_NAMES)) {
  for (const name of names) MONTH_LOOKUP.set(name.toLowerCase(), Number(num));
}

/** Alternation of all month names, longest first so "sept" wins over "sep". */
export const MONTH_ALTERNATION = [...MONTH_LOOKUP.keys()]
  .sort((a, b) => b.length - a.length)
  .map(escapeRegExp)
  .join("|");

export function monthFromName(name: string): number | undefined {
  return MONTH_LOOKUP.get(name.toLowerCase().replace(/\.$/, ""));
}

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function isValidDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

export function isoDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** "1,20,000.50" -> "120000.5"; returns undefined for non-numbers. */
export function normalizeNumber(raw: string): string | undefined {
  const cleaned = toLatinDigits(raw).replace(/[,\s]/g, "").replace(/\/-$/, "");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return undefined;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return undefined;
  return String(value);
}

/** 24-hour "HH:MM". */
export function formatTime24(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Collapse whitespace and lowercase Latin letters, leaving Indic text as is. */
export function foldText(text: string): string {
  return toLatinDigits(text).toLowerCase().replace(/\s+/g, " ");
}
