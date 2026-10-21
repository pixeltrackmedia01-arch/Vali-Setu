import { isBlocking } from "@/services/validation/compare";
import type { WorkflowStatus } from "./constants";

/**
 * Notice lifecycle:
 *
 *   DRAFT ──submit──▶ PENDING_APPROVAL ──approve──▶ APPROVED ──schedule──▶ SCHEDULED
 *     ▲                    │                           │                      │
 *     └──── edit ◀─ reject ┘◀──────── edit ────────────┴──────── dispatch ────┴──▶ DISPATCHED
 *
 * Any edit to the source, simplified text or a translation after submission
 * sends the notice back to DRAFT and clears the approval.
 */
export const TRANSITIONS: Record<WorkflowStatus, WorkflowStatus[]> = {
  DRAFT: ["PENDING_APPROVAL"],
  REJECTED: ["DRAFT", "PENDING_APPROVAL"],
  PENDING_APPROVAL: ["APPROVED", "REJECTED", "DRAFT"],
  APPROVED: ["SCHEDULED", "DISPATCHED", "REJECTED", "DRAFT"],
  SCHEDULED: ["DISPATCHED", "APPROVED", "DRAFT"],
  DISPATCHED: [],
};

export function canTransition(from: WorkflowStatus, to: WorkflowStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function isEditable(status: WorkflowStatus): boolean {
  return status !== "DISPATCHED";
}

/** Status after an edit: content changes after submission invalidate review and approval. */
export function statusAfterEdit(status: WorkflowStatus): WorkflowStatus {
  if (status === "DISPATCHED") throw new Error("Dispatched notices cannot be edited");
  return "DRAFT";
}

export interface EligibilityInput {
  status: WorkflowStatus;
  noticeVersion: number;
  sourceText: string;
  targetLanguages: string[];
  channels: string[];
  recipientCount: number;
  translations: {
    language: string;
    translatedText: string;
    sourceVersion: number;
    version: number;
    reviewState: string;
  }[];
  validations: {
    target: string;
    status: string;
    critical: boolean;
    resolution: string;
    noticeVersion: number;
    translationVersion: number | null;
  }[];
  audio: { language: string; status: string; textVersion: number }[];
}

export interface Eligibility {
  ok: boolean;
  /** Stable codes; the UI maps them to localised messages. */
  reasons: { code: string; language?: string; count?: number }[];
}

/** Checks shared by submit, approve and dispatch. Pure so it is easy to test. */
export function checkReadiness(input: EligibilityInput): Eligibility {
  const reasons: Eligibility["reasons"] = [];
  if (!input.sourceText.trim()) reasons.push({ code: "EMPTY_SOURCE" });
  if (input.targetLanguages.length === 0) reasons.push({ code: "NO_LANGUAGES" });
  if (input.channels.length === 0) reasons.push({ code: "NO_CHANNELS" });
  if (input.recipientCount === 0) reasons.push({ code: "NO_RECIPIENTS" });

  for (const language of input.targetLanguages) {
    const t = input.translations.find((x) => x.language === language);
    if (!t || !t.translatedText.trim()) {
      reasons.push({ code: "TRANSLATION_MISSING", language });
      continue;
    }
    if (t.reviewState === "REJECTED") reasons.push({ code: "TRANSLATION_REJECTED", language });
    if (t.sourceVersion < input.noticeVersion) reasons.push({ code: "TRANSLATION_STALE", language });
    const rows = input.validations.filter((v) => v.target === language);
    const current = rows.length > 0 && rows.every((v) => v.noticeVersion === input.noticeVersion && v.translationVersion === t.version);
    if (!current) {
      reasons.push({ code: "VALIDATION_NOT_RUN", language });
      continue;
    }
    const blocking = rows.filter((v) => isBlocking(v)).length;
    if (blocking > 0) reasons.push({ code: "UNRESOLVED_DISCREPANCIES", language, count: blocking });

    if (input.channels.includes("voice")) {
      const a = input.audio.find((x) => x.language === language);
      if (!a || a.status === "FAILED") reasons.push({ code: "AUDIO_MISSING", language });
      else if (a.status === "STALE" || a.textVersion !== t.version) reasons.push({ code: "AUDIO_STALE", language });
    }
  }
  return { ok: reasons.length === 0, reasons };
}

export function approvalEligibility(input: EligibilityInput): Eligibility {
  const base = checkReadiness(input);
  if (input.status !== "PENDING_APPROVAL") base.reasons.unshift({ code: "NOT_PENDING" });
  return { ok: base.reasons.length === 0, reasons: base.reasons };
}

export function dispatchEligibility(input: EligibilityInput): Eligibility {
  const base = checkReadiness(input);
  if (input.status !== "APPROVED" && input.status !== "SCHEDULED") base.reasons.unshift({ code: "NOT_APPROVED" });
  return { ok: base.reasons.length === 0, reasons: base.reasons };
}
