import { describe, expect, it } from "vitest";
import { approvalEligibility, canTransition, checkReadiness, dispatchEligibility, isEditable, statusAfterEdit, type EligibilityInput } from "@/lib/domain/workflow";

function ready(overrides: Partial<EligibilityInput> = {}): EligibilityInput {
  return {
    status: "PENDING_APPROVAL",
    noticeVersion: 2,
    sourceText: "Parent-Teacher Meeting on 25 October 2026 at 11:00 AM.",
    targetLanguages: ["gu"],
    channels: ["whatsapp"],
    recipientCount: 10,
    translations: [{ language: "gu", translatedText: "…", sourceVersion: 2, version: 3, reviewState: "OPEN" }],
    validations: [{ target: "gu", status: "MATCHED", critical: true, resolution: "OPEN", noticeVersion: 2, translationVersion: 3 }],
    audio: [],
    ...overrides,
  };
}
const codes = (e: { reasons: { code: string }[] }) => e.reasons.map((r) => r.code);

describe("workflow rules", () => {
  it("allows only the defined transitions", () => {
    expect(canTransition("DRAFT", "PENDING_APPROVAL")).toBe(true);
    expect(canTransition("DRAFT", "DISPATCHED")).toBe(false);
    expect(canTransition("DISPATCHED", "DRAFT")).toBe(false);
  });

  it("locks dispatched notices and returns edited notices to draft", () => {
    expect(isEditable("DISPATCHED")).toBe(false);
    expect(statusAfterEdit("APPROVED")).toBe("DRAFT");
    expect(() => statusAfterEdit("DISPATCHED")).toThrow();
  });

  it("a fully validated notice is ready", () => {
    expect(approvalEligibility(ready()).ok).toBe(true);
  });

  it("blocks unresolved critical findings but not reviewed or overridden ones", () => {
    const open = ready({ validations: [{ target: "gu", status: "MISMATCH", critical: true, resolution: "OPEN", noticeVersion: 2, translationVersion: 3 }] });
    expect(codes(checkReadiness(open))).toContain("UNRESOLVED_DISCREPANCIES");
    const overridden = ready({ validations: [{ target: "gu", status: "MISMATCH", critical: true, resolution: "OVERRIDDEN", noticeVersion: 2, translationVersion: 3 }] });
    expect(checkReadiness(overridden).ok).toBe(true);
  });

  it("treats validation of an older translation version as not run", () => {
    const old = ready({ validations: [{ target: "gu", status: "MATCHED", critical: true, resolution: "OPEN", noticeVersion: 2, translationVersion: 2 }] });
    expect(codes(checkReadiness(old))).toContain("VALIDATION_NOT_RUN");
  });

  it("flags stale, rejected and missing translations", () => {
    expect(codes(checkReadiness(ready({ translations: [] })))).toContain("TRANSLATION_MISSING");
    expect(codes(checkReadiness(ready({ translations: [{ language: "gu", translatedText: "x", sourceVersion: 1, version: 3, reviewState: "OPEN" }] })))).toContain("TRANSLATION_STALE");
    expect(codes(checkReadiness(ready({ translations: [{ language: "gu", translatedText: "x", sourceVersion: 2, version: 3, reviewState: "REJECTED" }] })))).toContain("TRANSLATION_REJECTED");
  });

  it("requires current audio only when voice calls are selected", () => {
    expect(codes(checkReadiness(ready({ channels: ["voice"] })))).toContain("AUDIO_MISSING");
    expect(codes(checkReadiness(ready({ channels: ["voice"], audio: [{ language: "gu", status: "READY", textVersion: 2 }] })))).toContain("AUDIO_STALE");
    expect(checkReadiness(ready({ channels: ["voice"], audio: [{ language: "gu", status: "SIMULATED", textVersion: 3 }] })).ok).toBe(true);
  });

  it("needs recipients, and the right status for approve and dispatch", () => {
    expect(codes(checkReadiness(ready({ recipientCount: 0 })))).toContain("NO_RECIPIENTS");
    expect(codes(approvalEligibility(ready({ status: "DRAFT" })))).toContain("NOT_PENDING");
    expect(codes(dispatchEligibility(ready()))).toContain("NOT_APPROVED");
    expect(dispatchEligibility(ready({ status: "APPROVED" })).ok).toBe(true);
  });
});
