import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { regionAnalytics, schoolDeliveryTable } from "@/services/analytics";
import { getNoticeForActor } from "@/services/notices";
import { acknowledgeMessage, askQuestion, getParentMessage, listParentMessages } from "@/services/parent";
import { buildExport } from "@/services/reports/export";
import { getFamily } from "@/services/school";
import { actor, noticeByTitle } from "./helpers";

type A = Awaited<ReturnType<typeof actor>>;
let parent: A, parentHi: A, otherHead: A, crc: A, district: A, head: A;

beforeAll(async () => {
  [parent, parentHi, otherHead, crc, district, head] = await Promise.all([
    actor("parent"),
    actor("parent.hi"),
    actor("head.demo-kl-001"),
    actor("crc"),
    actor("district"),
    actor("headteacher"),
  ]);
});

describe("parent portal", () => {
  it("lists only dispatched notices addressed to the parent", async () => {
    const messages = await listParentMessages(parent);
    expect(messages.length).toBeGreaterThan(0);
    const statuses = await db.notice.findMany({ where: { id: { in: messages.map((m) => m.noticeId) } }, select: { workflowStatus: true } });
    expect(statuses.every((s) => s.workflowStatus === "DISPATCHED")).toBe(true);
    const draft = await noticeByTitle("PTM reminder for 5-A");
    await expect(getParentMessage(parent, draft.id)).rejects.toMatchObject({ status: 404 });
  });

  it("acknowledgment is recorded once even when sent twice", async () => {
    const ptm = await noticeByTitle("Parent-Teacher Meeting on 25");
    const msg = await getParentMessage(parent, ptm.id);
    expect(msg.versions.map((v) => v.language).sort()).toEqual(["en", "gu", "hi"]);
    expect(msg.versions.find((v) => v.language === "gu")!.keyDetails.some((d) => d.type === "date")).toBe(true);
    const a = await acknowledgeMessage(parent, ptm.id, "ack-integration-1");
    const b = await acknowledgeMessage(parent, ptm.id, "ack-integration-2");
    expect(b.duplicate).toBe(true);
    expect(a.response.id).toBe(b.response.id);
    expect(await db.parentResponse.count({ where: { guardianId: parent.guardianId!, noticeId: ptm.id, responseType: "ACKNOWLEDGED" } })).toBe(1);
  });

  it("questions are stored once per client key", async () => {
    const ptm = await noticeByTitle("Parent-Teacher Meeting on 25");
    const input = { category: "DATE_TIME" as const, message: "Is the meeting at 11 in the morning?", callbackRequested: true, clientKey: "question-key-123" };
    const first = await askQuestion(parentHi, ptm.id, input);
    const retry = await askQuestion(parentHi, ptm.id, input);
    expect(retry.duplicate).toBe(true);
    expect(retry.response.id).toBe(first.response.id);
    expect(first.response.status).toBe("OPEN");
  });

  it("a parent cannot open another family's message", async () => {
    const otherSchoolNotice = await db.notice.findFirstOrThrow({ where: { school: { code: "DEMO-KL-001" }, workflowStatus: "DISPATCHED" } });
    await expect(getParentMessage(parent, otherSchoolNotice.id)).rejects.toMatchObject({ status: 404 });
  });
});

describe("school isolation", () => {
  it("staff cannot open notices or families from another school", async () => {
    const ours = await noticeByTitle("Parent-Teacher Meeting on 25");
    await expect(getNoticeForActor(otherHead, ours.id)).rejects.toMatchObject({ status: 404 });
    await expect(getFamily(otherHead, parent.guardianId!)).rejects.toMatchObject({ status: 404 });
    const table = await schoolDeliveryTable(otherHead, {}, 1, 500);
    expect(table.rows.some((r) => r.guardianId === parent.guardianId)).toBe(false);
  });
});

describe("regional access", () => {
  it("CRC sees only schools in the assigned cluster, and no contact details", async () => {
    const data = await regionAnalytics(crc, {});
    expect(data.schools.length).toBeGreaterThan(0);
    expect(data.schools.every((s) => s.cluster === "Khambhalia-1")).toBe(true);
    const json = JSON.stringify(data);
    expect(json).not.toMatch(/\+91|90000/);
    await expect(buildExport(crc, "contacts", {})).rejects.toMatchObject({ status: 403 });
    await expect(getNoticeForActor(crc, (await noticeByTitle("Parent-Teacher Meeting on 25")).id)).rejects.toBeTruthy();
  });

  it("district aggregates cover every school and add up", async () => {
    const data = await regionAnalytics(district, {});
    expect(data.metrics.schools).toBe(await db.school.count());
    expect(data.schools.reduce((a, s) => a + s.noticesSent, 0)).toBe(data.metrics.noticesSent);
    for (const s of data.schools) {
      expect(s.deliveryRate).toBeGreaterThanOrEqual(0);
      expect(s.deliveryRate).toBeLessThanOrEqual(100);
    }
  });

  it("exports are audited and contact export needs permission", async () => {
    const before = await db.auditLog.count({ where: { action: "report.exported" } });
    const { csv } = await buildExport(head, "contacts", {});
    expect(csv.split("\n")[0]).toContain("Phone");
    await buildExport(district, "region", {});
    expect(await db.auditLog.count({ where: { action: "report.exported" } })).toBe(before + 2);
  });
});
