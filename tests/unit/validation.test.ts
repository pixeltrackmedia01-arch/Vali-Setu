import { describe, expect, it } from "vitest";
import { extractCriticalDetails } from "@/services/validation/extract";
import { compareTexts, isBlocking } from "@/services/validation/compare";
import { toLatinDigits, toScriptDigits, normalizeNumber } from "@/services/validation/normalize";
import { DEMO_SAMPLES, PTM_GU_WRONG_DATE, PTM_HI_MISSING_ITEM, PTM_SOURCE } from "@/services/ai/demo-content";

const opts = { referenceYear: 2026 };
const ptm = DEMO_SAMPLES[0]!;

describe("normalisation", () => {
  it("maps Gujarati and Devanagari digits 1:1 without changing length", () => {
    expect(toLatinDigits("૨૫ ઓક્ટોબર ૨૦૨૬")).toBe("25 ઓક્ટોબર 2026");
    expect(toLatinDigits("२५ अक्टूबर २०२६")).toBe("25 अक्टूबर 2026");
    expect(toLatinDigits("૧૧:૦૦").length).toBe("૧૧:૦૦".length);
  });
  it("renders digits back in the native script", () => {
    expect(toScriptDigits("25", "gu")).toBe("૨૫");
    expect(toScriptDigits("25", "hi")).toBe("२५");
  });
  it("normalises Indian-grouped amounts", () => {
    expect(normalizeNumber("1,20,000")).toBe("120000");
    expect(normalizeNumber("૫,૦૦૦")).toBe("5000");
    expect(normalizeNumber("abc")).toBeUndefined();
  });
});

describe("date and time extraction", () => {
  it.each([
    ["25 October 2026", "2026-10-25"],
    ["25th Oct, 2026", "2026-10-25"],
    ["October 25, 2026", "2026-10-25"],
    ["25/10/2026", "2026-10-25"],
    ["૨૫ ઓક્ટોબર ૨૦૨૬", "2026-10-25"],
    ["25 अक्टूबर 2026", "2026-10-25"],
    ["25 October", "2026-10-25"],
  ])("reads %s as %s", (text, iso) => {
    const dates = extractCriticalDetails(text, opts).filter((e) => e.type === "date");
    expect(dates.map((d) => d.normalized)).toEqual([iso]);
  });

  it("rejects impossible dates", () => {
    expect(extractCriticalDetails("31/02/2026", opts).filter((e) => e.type === "date")).toHaveLength(0);
  });

  it.each([
    ["11:00 AM", "11:00", false],
    ["2:30 PM", "14:30", false],
    ["સવારે ૧૧:૦૦ વાગ્યે", "11:00", false],
    ["બપોરે ૨ વાગ્યે", "14:00", false],
    ["सुबह 11:00 बजे", "11:00", false],
    ["शाम 5 बजे", "17:00", false],
    ["11 AM", "11:00", false],
    ["14:00", "14:00", false],
    ["11:00 વાગ્યે", "11:00", true],
  ])("reads %s as %s", (text, hhmm, ambiguous) => {
    const times = extractCriticalDetails(text, opts).filter((e) => e.type === "time");
    expect(times).toHaveLength(1);
    expect(times[0]!.normalized).toBe(hhmm);
    expect(Boolean(times[0]!.ambiguous)).toBe(ambiguous);
  });

  it("marks dates near a deadline cue as deadlines", () => {
    const [d] = extractCriticalDetails("Submit the form on or before 31 October 2026.", opts).filter((e) => e.type === "deadline");
    expect(d?.normalized).toBe("2026-10-31");
    const [g] = extractCriticalDetails("ફોર્મ ૩૧ ઓક્ટોબર ૨૦૨૬ સુધીમાં જમા કરાવો.", opts).filter((e) => e.type === "deadline");
    expect(g?.normalized).toBe("2026-10-31");
  });
});

describe("other critical details", () => {
  it("extracts amounts, percentages, phones and classes", () => {
    const e = extractCriticalDetails("Pay ₹1,200 by 5 Nov. 75% attendance needed. Class 9-A. Call 90000 00001.", opts);
    expect(e.find((x) => x.type === "amount")?.normalized).toBe("1200");
    expect(e.find((x) => x.type === "percentage")?.normalized).toBe("75");
    expect(e.find((x) => x.type === "phone")?.normalized).toBe("9000000001");
    expect(e.find((x) => x.type === "class")?.normalized).toBe("class:9");
  });
  it("does not read a phone number as an amount or time", () => {
    const e = extractCriticalDetails("Call 90000 00001", opts);
    expect(e.map((x) => x.type).sort()).toEqual(["action", "phone"]);
  });
  it("finds required items and actions in all three languages", () => {
    for (const text of Object.values(ptm.translations)) {
      const keys = extractCriticalDetails(text, opts).map((e) => e.normalized);
      expect(keys).toContain("REPORT_CARD");
      expect(keys).toContain("BRING");
      expect(keys).toContain("PTM");
    }
  });
});

describe("comparison", () => {
  it("passes every curated demo translation", () => {
    for (const sample of DEMO_SAMPLES) {
      for (const [lang, text] of Object.entries({ simplified: sample.simplified, ...sample.translations })) {
        const rows = compareTexts(sample.source, text, opts);
        const blocking = rows.filter((r) => isBlocking(r));
        expect(blocking, `${sample.key}/${lang}: ${JSON.stringify(blocking, null, 1)}`).toEqual([]);
      }
    }
  });

  it("Scenario B: flags a wrong date even though the digits look alike", () => {
    const rows = compareTexts(PTM_SOURCE, PTM_GU_WRONG_DATE, opts);
    const date = rows.find((r) => r.fieldType === "date");
    expect(date?.status).toBe("MISMATCH");
    expect(date?.translatedValue).toBe("૨૬ ઓક્ટોબર ૨૦૨૬");
    expect(rows.some((r) => isBlocking(r))).toBe(true);
  });

  it("flags a changed month with unchanged digits", () => {
    const rows = compareTexts(PTM_SOURCE, PTM_SOURCE.replace("25 October", "25 November"), opts);
    expect(rows.find((r) => r.fieldType === "date")?.status).toBe("MISMATCH");
  });

  it("flags AM/PM swaps", () => {
    const rows = compareTexts(PTM_SOURCE, PTM_SOURCE.replace("11:00 AM", "11:00 PM"), opts);
    expect(rows.find((r) => r.fieldType === "time")?.status).toBe("MISMATCH");
  });

  it("needs review when a translation drops the day part", () => {
    const rows = compareTexts(PTM_SOURCE, ptm.translations.gu.replace("સવારે ", ""), opts);
    expect(rows.find((r) => r.fieldType === "time")?.status).toBe("NEEDS_REVIEW");
  });

  it("Scenario C: flags the missing report card and bring instruction", () => {
    const rows = compareTexts(PTM_SOURCE, PTM_HI_MISSING_ITEM, opts);
    const missing = rows.filter((r) => r.status === "MISSING").map((r) => r.normalizedValue);
    expect(missing).toContain("REPORT_CARD");
    expect(missing).toContain("BRING");
  });

  it("flags an added document as additional", () => {
    const rows = compareTexts(PTM_SOURCE, `${ptm.translations.en} Bring your Aadhaar card.`, opts);
    expect(rows.find((r) => r.normalizedValue === "AADHAAR")?.status).toBe("ADDITIONAL");
  });

  it("reports an empty translation as missing", () => {
    const rows = compareTexts(PTM_SOURCE, "  ", opts);
    expect(rows[0]?.status).toBe("MISSING");
  });

  it("marks text with no detectable details as unverifiable instead of passing it", () => {
    const rows = compareTexts("Please keep the school clean.", "કૃપા કરીને શાળા સ્વચ્છ રાખો.", opts);
    expect(rows.some((r) => r.status === "UNVERIFIABLE")).toBe(true);
  });

  it("treats resolved rows as non-blocking", () => {
    expect(isBlocking({ status: "MISMATCH", critical: true, resolution: "OVERRIDDEN" })).toBe(false);
    expect(isBlocking({ status: "MISMATCH", critical: true, resolution: "OPEN" })).toBe(true);
    expect(isBlocking({ status: "NEEDS_REVIEW", critical: false })).toBe(false);
  });
});
