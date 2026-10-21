import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "@/lib/utils/csv";

describe("CSV export", () => {
  it("quotes commas, quotes and newlines", () => {
    expect(csvCell('Parmar, "Meena"')).toBe('"Parmar, ""Meena"""');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("neutralises spreadsheet formulas", () => {
    expect(csvCell("=HYPERLINK(\"x\")")).toBe("\"'=HYPERLINK(\"\"x\"\")\"");
    expect(csvCell("+91 90000 00001")).toBe("'+91 90000 00001");
    expect(csvCell("@cmd")).toBe("'@cmd");
  });

  it("keeps numbers, empties and Indic text intact", () => {
    expect(csvCell(42)).toBe("42");
    expect(csvCell(null)).toBe("");
    expect(csvCell("વાલી મીટિંગ")).toBe("વાલી મીટિંગ");
  });

  it("starts with a BOM and uses CRLF rows", () => {
    const csv = toCsv(["a", "b"], [[1, "x"]]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1)).toBe("a,b\r\n1,x\r\n");
  });
});
