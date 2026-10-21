import type { ValidationStatus } from "@/lib/domain/constants";
import { extractCriticalDetails, type DetailEntity, type DetailType, type ExtractOptions } from "./extract";

export interface ValidationRow {
  fieldType: DetailType | "completeness" | "general";
  label: string;
  sourceValue: string;
  normalizedValue: string | null;
  translatedValue: string | null;
  status: ValidationStatus;
  critical: boolean;
  explanation: string;
}

/** Value groups compared as multisets of normalized values. */
const VALUE_GROUPS: DetailType[][] = [["date", "deadline"], ["time"], ["amount"], ["percentage"], ["phone"], ["class"], ["identifier"]];
const CONCEPT_TYPES: DetailType[] = ["document", "action", "location", "event"];

const TYPE_LABEL: Record<string, string> = {
  date: "Date",
  deadline: "Deadline",
  time: "Time",
  amount: "Amount",
  percentage: "Percentage",
  phone: "Phone number",
  class: "Class",
  identifier: "Student identifier",
  document: "Required item",
  action: "Required action",
  location: "Location",
  event: "Event",
  completeness: "Completeness",
  general: "Critical details",
};

export function labelForType(type: string): string {
  return TYPE_LABEL[type] ?? type;
}

function hour12(normalized: string): string {
  const [h, m] = normalized.split(":").map(Number);
  return `${(h! % 12) || 12}:${m}`;
}

/**
 * Compare the critical details of a source notice with a derived text
 * (simplified notice or translation). The result is evidence for a reviewer:
 * "MATCHED" means the same normalized value was found, not that the sentence
 * means the same thing.
 */
export function compareTexts(source: string, target: string, options: ExtractOptions = {}): ValidationRow[] {
  const sourceEntities = extractCriticalDetails(source, options);
  const targetEntities = extractCriticalDetails(target, options);
  return compareEntities(sourceEntities, targetEntities, source, target);
}

export function compareEntities(
  sourceEntities: DetailEntity[],
  targetEntities: DetailEntity[],
  sourceText: string,
  targetText: string,
): ValidationRow[] {
  const rows: ValidationRow[] = [];

  if (!targetText.trim()) {
    return [
      {
        fieldType: "completeness",
        label: labelForType("completeness"),
        sourceValue: "Full notice",
        normalizedValue: null,
        translatedValue: null,
        status: "MISSING",
        critical: true,
        explanation: "The text is empty.",
      },
    ];
  }

  for (const group of VALUE_GROUPS) {
    const src = sourceEntities.filter((e) => group.includes(e.type));
    const tgt = targetEntities.filter((e) => group.includes(e.type));
    const remainingTarget = [...tgt];
    const unmatchedSource: DetailEntity[] = [];

    for (const s of src) {
      const exact = remainingTarget.findIndex((t) => t.normalized === s.normalized && !t.ambiguous);
      if (exact >= 0) {
        const [t] = remainingTarget.splice(exact, 1);
        rows.push(row(s, t!, "MATCHED", "Same value found."));
        continue;
      }
      if (s.type === "time") {
        const loose = remainingTarget.findIndex((t) => hour12(t.normalized) === hour12(s.normalized) && (t.ambiguous || s.ambiguous));
        if (loose >= 0) {
          const [t] = remainingTarget.splice(loose, 1);
          rows.push(row(s, t!, "NEEDS_REVIEW", "Same clock time, but morning/afternoon is not stated in one of the texts."));
          continue;
        }
      }
      unmatchedSource.push(s);
    }

    // Pair leftovers of the same kind: a changed value is a mismatch, not an omission.
    for (const s of unmatchedSource) {
      const t = remainingTarget.shift();
      if (t) {
        rows.push(row(s, t, "MISMATCH", `Source says "${s.raw}" but this version says "${t.raw}".`));
      } else {
        rows.push(row(s, null, "MISSING", `"${s.raw}" does not appear in this version.`));
      }
    }
    for (const t of remainingTarget) {
      rows.push({
        fieldType: t.type,
        label: labelForType(t.type),
        sourceValue: "—",
        normalizedValue: t.normalized,
        translatedValue: t.raw,
        status: "ADDITIONAL",
        critical: t.critical,
        explanation: `"${t.raw}" is not in the source notice.`,
      });
    }
  }

  for (const type of CONCEPT_TYPES) {
    const src = sourceEntities.filter((e) => e.type === type);
    const tgt = targetEntities.filter((e) => e.type === type);
    for (const s of src) {
      const t = tgt.find((e) => e.normalized === s.normalized);
      if (t) {
        rows.push(row(s, t, "MATCHED", `${s.label} is mentioned.`));
      } else {
        rows.push({
          ...row(s, null, s.critical ? "MISSING" : "NEEDS_REVIEW", `${s.label} was not found. Check the wording, it may be phrased differently.`),
        });
      }
    }
    for (const t of tgt) {
      if (src.some((e) => e.normalized === t.normalized)) continue;
      // Extra documents change what parents must do; extra actions or places are usually phrasing.
      rows.push({
        fieldType: t.type,
        label: labelForType(t.type),
        sourceValue: "—",
        normalizedValue: t.normalized,
        translatedValue: t.raw,
        status: t.type === "document" ? "ADDITIONAL" : "NEEDS_REVIEW",
        critical: t.type === "document",
        explanation: `${t.label} appears here but not in the source notice.`,
      });
    }
  }

  if (sourceEntities.length === 0) {
    rows.push({
      fieldType: "general",
      label: labelForType("general"),
      sourceValue: "—",
      normalizedValue: null,
      translatedValue: null,
      status: "UNVERIFIABLE",
      critical: false,
      explanation: "No dates, times, amounts or known items were detected automatically. Read both versions side by side.",
    });
  }

  // Very short output relative to the source usually means a sentence was dropped.
  const ratio = targetText.trim().length / Math.max(1, sourceText.trim().length);
  if (ratio < 0.35) {
    rows.push({
      fieldType: "completeness",
      label: labelForType("completeness"),
      sourceValue: `${sourceText.trim().length} characters`,
      normalizedValue: null,
      translatedValue: `${targetText.trim().length} characters`,
      status: "NEEDS_REVIEW",
      critical: true,
      explanation: "This version is much shorter than the source. Check that no instruction was dropped.",
    });
  }

  return rows;
}

function row(source: DetailEntity, target: DetailEntity | null, status: ValidationStatus, explanation: string): ValidationRow {
  return {
    fieldType: source.type,
    label: source.label ? `${labelForType(source.type)}: ${source.label}` : labelForType(source.type),
    sourceValue: source.raw,
    normalizedValue: source.normalized,
    translatedValue: target?.raw ?? null,
    status,
    critical: source.critical,
    explanation,
  };
}

/** A row blocks approval while it is critical, not matched and not resolved by a person. */
export function isBlocking(r: { status: string; critical: boolean; resolution?: string }): boolean {
  if (r.status === "MATCHED") return false;
  if (r.resolution && r.resolution !== "OPEN") return false;
  return r.critical;
}

/** Statuses that need an authorised override with a reason rather than a simple review mark. */
export function requiresOverride(status: string): boolean {
  return status === "MISMATCH" || status === "MISSING";
}
