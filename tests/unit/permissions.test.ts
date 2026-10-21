import { describe, expect, it } from "vitest";
import { can, canExportContacts, noticeScope, schoolInScope, schoolScope, type Actor } from "@/lib/permissions";

const base: Actor = { id: "u1", role: "TEACHER", schoolId: "s1", cluster: null, block: null, district: null, canApprove: false };
const school = { id: "s1", district: "Devbhumi Dwarka", block: "Khambhalia", cluster: "Khambhalia-1" };

describe("permissions", () => {
  it("teachers approve only when granted approval rights", () => {
    expect(can(base, "notice.approve")).toBe(false);
    expect(can({ ...base, canApprove: true }, "notice.approve")).toBe(true);
    expect(can({ ...base, role: "HEAD_TEACHER" }, "notice.approve")).toBe(true);
    expect(can({ ...base, role: "SCHOOL_ADMIN" }, "notice.approve")).toBe(false);
  });

  it("regional roles get aggregates only and no contact export", () => {
    const crc: Actor = { ...base, role: "CRC_OFFICER", schoolId: null, district: school.district, block: school.block, cluster: school.cluster };
    expect(can(crc, "reports.region")).toBe(true);
    expect(can(crc, "notice.view")).toBe(false);
    expect(canExportContacts(crc)).toBe(false);
    expect(noticeScope(crc)).toEqual({ id: "__none__" });
    expect(schoolInScope(crc, school)).toBe(true);
    expect(schoolInScope(crc, { ...school, cluster: "Khambhalia-2" })).toBe(false);
  });

  it("BRC covers the block and district covers the district", () => {
    const brc: Actor = { ...base, role: "BRC_OFFICER", schoolId: null, district: school.district, block: school.block };
    expect(schoolInScope(brc, { ...school, cluster: "Khambhalia-2" })).toBe(true);
    expect(schoolInScope(brc, { ...school, block: "Dwarka" })).toBe(false);
    const dist: Actor = { ...base, role: "DISTRICT_OFFICIAL", schoolId: null, district: school.district };
    expect(schoolScope(dist)).toEqual({ district: school.district });
  });

  it("missing scope fields never widen access", () => {
    const crc: Actor = { ...base, role: "CRC_OFFICER", schoolId: null };
    expect(schoolScope(crc)).toEqual({ district: "__none__", block: "__none__", cluster: "__none__" });
    expect(schoolScope({ ...base, role: "PARENT" })).toEqual({ id: "__none__" });
  });

  it("teachers see their own notices or their classes' notices only", () => {
    expect(noticeScope(base)).toMatchObject({ schoolId: "s1", OR: expect.any(Array) });
    expect(noticeScope({ ...base, role: "HEAD_TEACHER" })).toEqual({ schoolId: "s1" });
  });
});
