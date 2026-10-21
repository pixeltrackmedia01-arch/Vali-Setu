import { CONCEPTS, DEADLINE_CUES, type ConceptType } from "./glossary";
import {
  MONTH_ALTERNATION,
  escapeRegExp,
  formatTime24,
  isValidDate,
  isoDate,
  monthFromName,
  normalizeNumber,
  toLatinDigits,
} from "./normalize";

export type DetailType =
  | "date"
  | "deadline"
  | "time"
  | "amount"
  | "percentage"
  | "phone"
  | "class"
  | "identifier"
  | ConceptType;

export interface DetailEntity {
  type: DetailType;
  /** Exactly as written in the text, in its original script. */
  raw: string;
  /** Comparable form: ISO date, 24h time, plain number, concept key... */
  normalized: string;
  start: number;
  end: number;
  critical: boolean;
  /** Time without AM/PM or day-part word: hour could be read two ways. */
  ambiguous?: boolean;
  /** Human-readable label for concepts. */
  label?: string;
}

export interface ExtractOptions {
  /** Year assumed when a date omits it ("25 October"). */
  referenceYear?: number;
}

// Letters and combining marks of any script, used to emulate word boundaries
// because \b does not understand Gujarati or Devanagari.
const NOT_WORD_BEFORE = "(?<![\\p{L}\\p{M}\\p{N}])";
const NOT_WORD_AFTER = "(?![\\p{L}\\p{M}\\p{N}])";
const NOT_LATIN_BEFORE = "(?<![A-Za-z0-9])";
const NOT_LATIN_AFTER = "(?![A-Za-z])";

const MORNING = ["am", "a.m.", "a.m", "સવારે", "સવારના", "સવાર", "सुबह", "प्रातः", "प्रात:"];
const AFTERNOON_EVENING = [
  "pm",
  "p.m.",
  "p.m",
  "બપોરે",
  "બપોરના",
  "સાંજે",
  "સાંજના",
  "રાત્રે",
  "दोपहर",
  "शाम",
  "सायं",
  "रात",
];
const OCLOCK = ["વાગ્યે", "વાગે", "વાગ્યા", "कलाक", "बजे", "o'clock", "hrs", "hours"];

function alternation(words: string[]): string {
  return [...words].sort((a, b) => b.length - a.length).map(escapeRegExp).join("|");
}

const DAY_PART_BEFORE = `(?:(${alternation(MORNING)})|(${alternation(AFTERNOON_EVENING)}))\\s*`;
const MERIDIEM_AFTER = `\\s*(?:(${alternation(MORNING)})|(${alternation(AFTERNOON_EVENING)}))`;

// "25 October 2026", "25th Oct, 2026", "૨૫ ઓક્ટોબર ૨૦૨૬", "25 अक्टूबर"
const DATE_DMY = new RegExp(
  `${NOT_WORD_BEFORE}(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:of\\s+)?(${MONTH_ALTERNATION})\\.?(?:,?\\s*(\\d{4}))?${NOT_WORD_AFTER}`,
  "giu",
);
// "October 25, 2026"
const DATE_MDY = new RegExp(
  `${NOT_WORD_BEFORE}(${MONTH_ALTERNATION})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(\\d{4}))?${NOT_WORD_AFTER}`,
  "giu",
);
// "25/10/2026", "25-10-2026", "25.10.26"
const DATE_NUMERIC = /(?<![\d/.-])(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})(?![\d/.-])/g;

const TIME_CLOCK = new RegExp(
  `(?:${DAY_PART_BEFORE})?(?<![\\d:.])(\\d{1,2})[:.](\\d{2})(?![\\d])(?:${MERIDIEM_AFTER}${NOT_WORD_AFTER})?(?:\\s*(?:${alternation(OCLOCK)}))?`,
  "giu",
);
// "11 AM", "સવારે 11 વાગ્યે", "दोपहर 2 बजे"
const TIME_HOUR = new RegExp(
  `(?:${DAY_PART_BEFORE})?(?<![\\d:.,])(\\d{1,2})(?:(?:${MERIDIEM_AFTER})${NOT_WORD_AFTER}|\\s*(?:${alternation(OCLOCK)}))`,
  "giu",
);

const AMOUNT_PREFIX = /(?<![a-z])(?:₹|rs\.?|inr|rupees)\s*(\d{1,3}(?:,\d{2,3})+|\d+)(?:\.\d{1,2})?(?:\s*\/-)?/giu;
const AMOUNT_SUFFIX = new RegExp(
  `(?<![\\d,])(\\d{1,3}(?:,\\d{2,3})+|\\d+)(?:\\.\\d{1,2})?\\s*(?:rupees|rs\\.?|રૂપિયા|રૂ\\.?|रुपये|रुपए|रुपया|रु\\.?)${NOT_WORD_AFTER}`,
  "giu",
);
const PERCENT = new RegExp(
  `(?<![\\d.])(\\d{1,3}(?:\\.\\d+)?)\\s*(?:%|percent|per cent|ટકા|प्रतिशत|फ़ीसदी|फीसदी)`,
  "giu",
);
// Indian mobile numbers and landlines with STD code.
const PHONE = /(?<![\d])(?:(?:\+|00)?91[\s-]?)?([6-9]\d{4}[\s-]?\d{5})(?![\d])|(?<![\d])(0\d{2,4}[\s-]\d{6,8})(?![\d])/g;
const CLASS_ID = new RegExp(
  `${NOT_WORD_BEFORE}(?:class(?:es)?|std\\.?|standard|grade|ધોરણ|ધો\\.|कक्षा)\\s*[-:]?\\s*(\\d{1,2})(?:\\s*[-–]?\\s*([A-Da-d]|અ|બ|ક|ड|अ|ब|स)(?![\\p{L}\\p{M}]))?`,
  "giu",
);
const IDENTIFIER = new RegExp(
  `${NOT_WORD_BEFORE}(roll\\s*no\\.?|roll\\s*number|gr\\s*no\\.?|student\\s*id|રોલ\\s*નંબર|જી\\.?આર\\.?\\s*નંબર|रोल\\s*नंबर|रोल\\s*नं\\.?)\\s*[:-]?\\s*(\\d{1,8})`,
  "giu",
);

type Span = [number, number];

function overlaps(spans: Span[], start: number, end: number): boolean {
  return spans.some(([s, e]) => start < e && end > s);
}

function dayPartHour(hour: number, morning?: string, later?: string): { hour: number; ambiguous: boolean } {
  if (later) {
    // "બપોરે 12" is noon; "રાત્રે 12" is rare in school notices, keep as noon.
    return { hour: hour < 12 ? hour + 12 : hour, ambiguous: false };
  }
  if (morning) return { hour: hour === 12 ? 0 : hour, ambiguous: false };
  return { hour, ambiguous: hour >= 1 && hour <= 12 };
}

/**
 * Deterministic extraction of critical details. This is one source of evidence
 * only: an AI extractor can add candidates, and people resolve what neither can.
 */
export function extractCriticalDetails(text: string, options: ExtractOptions = {}): DetailEntity[] {
  const referenceYear = options.referenceYear ?? new Date().getUTCFullYear();
  const latin = toLatinDigits(text);
  const lower = latin.toLowerCase();
  const entities: DetailEntity[] = [];
  const taken: Span[] = [];

  const push = (entity: DetailEntity) => {
    entities.push(entity);
    taken.push([entity.start, entity.end]);
  };

  // Phones first so their digits are never read as amounts or dates.
  for (const m of latin.matchAll(PHONE)) {
    const digits = (m[1] ?? m[2] ?? "").replace(/\D/g, "");
    push({
      type: "phone",
      raw: text.slice(m.index, m.index + m[0].length),
      normalized: digits.length > 10 ? digits.slice(-10) : digits,
      start: m.index,
      end: m.index + m[0].length,
      critical: true,
    });
  }

  const addDate = (index: number, length: number, y: number, mo: number, d: number) => {
    if (overlaps(taken, index, index + length)) return;
    if (!isValidDate(y, mo, d)) return;
    push({
      type: "date",
      raw: text.slice(index, index + length),
      normalized: isoDate(y, mo, d),
      start: index,
      end: index + length,
      critical: true,
    });
  };

  for (const m of latin.matchAll(DATE_DMY)) {
    const month = monthFromName(m[2]!);
    if (!month) continue;
    addDate(m.index, m[0].length, m[3] ? Number(m[3]) : referenceYear, month, Number(m[1]));
  }
  for (const m of latin.matchAll(DATE_MDY)) {
    const month = monthFromName(m[1]!);
    if (!month) continue;
    // "may 5" is plausible, but "may" is also an English verb ("you may 2...") — require a day <= 31 which addDate checks.
    addDate(m.index, m[0].length, m[3] ? Number(m[3]) : referenceYear, month, Number(m[2]));
  }
  for (const m of latin.matchAll(DATE_NUMERIC)) {
    const yearRaw = m[3]!;
    const year = yearRaw.length === 2 ? 2000 + Number(yearRaw) : Number(yearRaw);
    // Indian convention: day first.
    addDate(m.index, m[0].length, year, Number(m[2]), Number(m[1]));
  }

  // Mark dates near a deadline cue as deadlines.
  const cuePattern = new RegExp(
    `${NOT_WORD_BEFORE}(?:${alternation(Object.values(DEADLINE_CUES).flat())})${NOT_WORD_AFTER}`,
    "giu",
  );
  const cues = [...lower.matchAll(cuePattern)].map((m) => [m.index, m.index + m[0].length] as Span);
  for (const entity of entities) {
    if (entity.type !== "date") continue;
    const near = cues.some(([s, e]) => (e <= entity.start && entity.start - e <= 20) || (s >= entity.end && s - entity.end <= 12));
    if (near) entity.type = "deadline";
  }

  for (const m of latin.matchAll(TIME_CLOCK)) {
    const start = m.index;
    const end = start + m[0].length;
    if (overlaps(taken, start, end)) continue;
    const hour = Number(m[3]);
    const minute = Number(m[4]);
    if (hour > 23 || minute > 59) continue;
    const morning = m[1] ?? m[5];
    const later = m[2] ?? m[6];
    const resolved = hour > 12 ? { hour, ambiguous: false } : dayPartHour(hour, morning, later);
    push({
      type: "time",
      raw: text.slice(start, end).trim(),
      normalized: formatTime24(resolved.hour, minute),
      start,
      end,
      critical: true,
      ambiguous: resolved.ambiguous,
    });
  }
  for (const m of latin.matchAll(TIME_HOUR)) {
    const start = m.index;
    const end = start + m[0].length;
    if (overlaps(taken, start, end)) continue;
    const hour = Number(m[3]);
    if (hour > 23) continue;
    const morning = m[1] ?? m[4];
    const later = m[2] ?? m[5];
    const resolved = hour > 12 ? { hour, ambiguous: false } : dayPartHour(hour, morning, later);
    push({
      type: "time",
      raw: text.slice(start, end).trim(),
      normalized: formatTime24(resolved.hour, 0),
      start,
      end,
      critical: true,
      ambiguous: resolved.ambiguous,
    });
  }

  for (const pattern of [AMOUNT_PREFIX, AMOUNT_SUFFIX]) {
    for (const m of latin.matchAll(pattern)) {
      const start = m.index;
      const end = start + m[0].length;
      if (overlaps(taken, start, end)) continue;
      const value = normalizeNumber(m[1]!);
      if (!value) continue;
      push({ type: "amount", raw: text.slice(start, end).trim(), normalized: value, start, end, critical: true });
    }
  }

  for (const m of latin.matchAll(PERCENT)) {
    const start = m.index;
    const end = start + m[0].length;
    if (overlaps(taken, start, end)) continue;
    push({ type: "percentage", raw: text.slice(start, end), normalized: String(Number(m[1])), start, end, critical: true });
  }

  for (const m of latin.matchAll(CLASS_ID)) {
    const start = m.index;
    const end = start + m[0].length;
    if (overlaps(taken, start, end)) continue;
    push({
      type: "class",
      raw: text.slice(start, end).trim(),
      normalized: `class:${Number(m[1])}`,
      start,
      end,
      critical: true,
    });
  }

  for (const m of latin.matchAll(IDENTIFIER)) {
    const start = m.index;
    const end = start + m[0].length;
    if (overlaps(taken, start, end)) continue;
    push({ type: "identifier", raw: text.slice(start, end), normalized: `id:${Number(m[2])}`, start, end, critical: true });
  }

  // Concepts are matched in every language so code-mixed text still counts.
  for (const concept of CONCEPTS) {
    const phrases = Object.values(concept.phrases).flat();
    let found: { index: number; length: number } | undefined;
    for (const phrase of phrases) {
      const isLatin = /^[\x00-\x7f]+$/.test(phrase);
      const pattern = isLatin
        ? new RegExp(`${NOT_LATIN_BEFORE}${escapeRegExp(phrase)}(?:s|es|ed|d|ing|ted|ting|ned|ning|red|ring)?${NOT_LATIN_AFTER}`, "i")
        : new RegExp(`${NOT_WORD_BEFORE}${escapeRegExp(phrase)}`, "u");
      const m = pattern.exec(lower);
      if (m && (!found || m.index < found.index)) found = { index: m.index, length: m[0].length };
    }
    if (found) {
      entities.push({
        type: concept.type,
        raw: text.slice(found.index, found.index + found.length),
        normalized: concept.key,
        start: found.index,
        end: found.index + found.length,
        critical: concept.critical,
        label: concept.label,
      });
    }
  }

  return entities.sort((a, b) => a.start - b.start);
}

/** Shape used by the AI extraction contract in services/ai. */
export function toCriticalDetails(entities: DetailEntity[]) {
  const pick = (...types: DetailType[]) => entities.filter((e) => types.includes(e.type)).map((e) => e.raw);
  return {
    dates: pick("date"),
    times: pick("time"),
    amounts: pick("amount", "percentage"),
    phoneNumbers: pick("phone"),
    identifiers: pick("identifier", "class"),
    locations: pick("location"),
    requiredItems: pick("document"),
    actions: pick("action"),
    deadlines: pick("deadline"),
  };
}
