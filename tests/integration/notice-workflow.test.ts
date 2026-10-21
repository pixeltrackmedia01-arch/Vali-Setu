import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { DEMO_SAMPLES, PTM_GU_WRONG_DATE } from "@/services/ai/demo-content";
import {
  approveNotice,
  createNotice,
  editTranslation,
  generateAudio,
  generateTranslation,
  getNoticeForActor,
  rejectNotice,
  resolveValidation,
  simplifyNotice,
  submitNotice,
  updateNotice,
  validateNotice,
} from "@/services/notices";
import { dispatchNotice } from "@/services/notices/dispatch";
import { actor, noticeByTitle } from "./helpers";

type A = Awaited<ReturnType<typeof actor>>;
let teacher: A, head: A, admin: A;
const ptm = DEMO_SAMPLES.find((s) => s.key === "ptm")!;

async function classIds(codes: string[]) {
  const school = await db.school.findUniqueOrThrow({ where: { code: "DEMO-KH-001" } });
  const sections = await db.classSection.findMany({ where: { schoolId: school.id } });
  return sections.filter((s) => codes.includes(`${s.grade}${s.section}`)).map((s) => s.id);
}

async function newPtmNotice(title: string) {
  return createNotice(teacher, {
    title,
    category: "PTM",
    sourceText: ptm.source,
    sourceLanguage: "en",
    priority: "HIGH",
    classSectionIds: await classIds(["5A"]),
    recipientMode: "CLASS",
    selectedGuardianIds: [],
    targetLanguages: ["gu", "hi", "en"],
    channels: ["whatsapp", "sms"],
  });
}

beforeAll(async () => {
  [teacher, head, admin] = await Promise.all([actor("teacher"), actor("headteacher"), actor("admin")]);
});

describe("notice persistence and versioning", () => {
  it("creates a draft with version 1 and keeps the original text on edit", async () => {
    const n = await newPtmNotice("Integration: versioning");
    expect(n.workflowStatus).toBe("DRAFT");
    expect(n.version).toBe(1);
    await updateNotice(teacher, n.id, { sourceText: `${ptm.source} ` + "Please be on time." });
    const after = await getNoticeForActor(teacher, n.id);
    expect(after.version).toBe(2);
    expect(after.versions.map((v) => v.version)).toEqual([2, 1]);
    expect(after.versions.find((v) => v.version === 1)!.sourceText).toBe(ptm.source);
  });

  it("refuses classes the teacher is not assigned to", async () => {
    await expect(
      createNotice(teacher, {
        title: "Not my class",
        category: "OTHER",
        sourceText: "This notice is for a class I do not teach.",
        sourceLanguage: "en",
        priority: "NORMAL",
        classSectionIds: await classIds(["9A"]),
        recipientMode: "CLASS",
        selectedGuardianIds: [],
        targetLanguages: ["gu"],
        channels: ["sms"],
      }),
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe("translations and validation", () => {
  it("generates labelled demo translations and an edit never overwrites the source", async () => {
    const n = await newPtmNotice("Integration: translations");
    await simplifyNotice(teacher, n.id);
    for (const l of ["gu", "hi", "en"] as const) await generateTranslation(teacher, n.id, l);
    let detail = await getNoticeForActor(teacher, n.id);
    expect(detail.translations).toHaveLength(3);
    expect(detail.translations.every((t) => t.provider === "demo")).toBe(true);
    await editTranslation(teacher, n.id, "gu", PTM_GU_WRONG_DATE);
    detail = await getNoticeForActor(teacher, n.id);
    const gu = detail.translations.find((t) => t.language === "gu")!;
    expect(gu.editedText).toBe(PTM_GU_WRONG_DATE);
    expect(gu.generatedText).toBe(ptm.translations.gu);
    expect(detail.sourceText).toBe(ptm.source);
  });

  it("Scenario B: a wrong Gujarati date blocks approval until corrected", async () => {
    const n = await noticeByTitle("PTM reminder for 5-B");
    expect(n.workflowStatus).toBe("PENDING_APPROVAL");
    await expect(approveNotice(head, n.id)).rejects.toMatchObject({ code: "NOT_ELIGIBLE" });
    const detail = await getNoticeForActor(head, n.id);
    const mismatch = detail.validations.find((v) => v.target === "gu" && v.status === "MISMATCH");
    expect(mismatch?.fieldType).toBe("date");
    // Marking a mismatch "reviewed" is not allowed; it needs a fix or an override with reason.
    await expect(resolveValidation(head, n.id, mismatch!.id, "REVIEWED")).rejects.toMatchObject({ code: "OVERRIDE_REQUIRED" });
    await expect(resolveValidation(head, n.id, mismatch!.id, "OVERRIDDEN", "short")).rejects.toMatchObject({ code: "REASON_REQUIRED" });
  });

  it("Scenario C: a Hindi version missing the report card is flagged MISSING", async () => {
    const n = await noticeByTitle("PTM reminder for 5-A");
    const detail = await getNoticeForActor(teacher, n.id);
    const hi = detail.validations.filter((v) => v.target === "hi" && v.status === "MISSING");
    expect(hi.map((v) => v.sourceValue)).toContain("report card");
    await expect(submitNotice(teacher, n.id)).resolves.toBeUndefined();
    await expect(approveNotice(head, n.id)).rejects.toMatchObject({ code: "NOT_ELIGIBLE" });
  });
});

describe("approval, rejection and dispatch", () => {
  it("enforces second-person approval and resets approval after an edit", async () => {
    const n = await newPtmNotice("Integration: approval");
    for (const l of ["gu", "hi", "en"] as const) await generateTranslation(teacher, n.id, l);
    await validateNotice(teacher, n.id);
    await submitNotice(teacher, n.id);
    // A teacher without approval rights cannot approve; the head teacher can.
    await expect(approveNotice(teacher, n.id)).rejects.toMatchObject({ status: 403 });
    await approveNotice(head, n.id);
    expect((await getNoticeForActor(head, n.id)).workflowStatus).toBe("APPROVED");

    await editTranslation(teacher, n.id, "en", ptm.translations.en.replace("Parent-Teacher Meeting", "PTM"));
    const edited = await getNoticeForActor(head, n.id);
    expect(edited.workflowStatus).toBe("DRAFT");
    expect(edited.approvedById).toBeNull();
  });

  it("a teacher with approval rights still cannot approve their own notice", async () => {
    const teacher2 = await actor("teacher2");
    const own = await createNotice(teacher2, {
      title: "Integration: self approval",
      category: "PTM",
      sourceText: ptm.source,
      sourceLanguage: "en",
      priority: "NORMAL",
      classSectionIds: await classIds(["6A"]),
      recipientMode: "CLASS",
      selectedGuardianIds: [],
      targetLanguages: ["en"],
      channels: ["sms"],
    });
    await generateTranslation(teacher2, own.id, "en");
    await validateNotice(teacher2, own.id);
    await submitNotice(teacher2, own.id);
    await expect(approveNotice(teacher2, own.id)).rejects.toMatchObject({ status: 403 });
    await expect(approveNotice(head, own.id)).resolves.toBeUndefined();
  });

  it("rejection records the reason", async () => {
    const n = await newPtmNotice("Integration: rejection");
    for (const l of ["gu", "hi", "en"] as const) await generateTranslation(teacher, n.id, l);
    await validateNotice(teacher, n.id);
    await submitNotice(teacher, n.id);
    await rejectNotice(head, n.id, "Please add the meeting room number.");
    const after = await getNoticeForActor(teacher, n.id);
    expect(after.workflowStatus).toBe("REJECTED");
    expect(after.rejectionReason).toContain("room number");
    const log = await db.auditLog.findFirst({ where: { entityId: n.id, action: "notice.rejected" } });
    expect(log).not.toBeNull();
  });

  it("dispatch is idempotent and simulated in demo mode", async () => {
    const n = await newPtmNotice("Integration: dispatch");
    for (const l of ["gu", "hi", "en"] as const) await generateTranslation(teacher, n.id, l);
    await validateNotice(teacher, n.id);
    await submitNotice(teacher, n.id);
    await expect(dispatchNotice(teacher, n.id, "key-before-approval")).rejects.toMatchObject({ status: 409 });
    await approveNotice(head, n.id);
    const first = await dispatchNotice(teacher, n.id, "integration-dispatch-key-1");
    expect(first.mode).toBe("demo");
    expect(first.duplicate).toBe(false);
    expect(first.totalRecipients).toBeGreaterThan(0);
    const count = await db.noticeRecipient.count({ where: { noticeId: n.id } });

    const again = await dispatchNotice(teacher, n.id, "integration-dispatch-key-1");
    const otherKey = await dispatchNotice(teacher, n.id, "integration-dispatch-key-2");
    expect(again.duplicate).toBe(true);
    expect(otherKey.duplicate).toBe(true);
    expect(await db.noticeRecipient.count({ where: { noticeId: n.id } })).toBe(count);
    expect(await db.noticeRecipient.count({ where: { noticeId: n.id, simulated: false } })).toBe(0);
    // Dispatched notices are locked.
    await expect(updateNotice(teacher, n.id, { title: "Changed after sending" })).rejects.toMatchObject({ code: "NOT_EDITABLE" });
  });

  it("audio for voice notices uses the demo provider and goes stale after an edit", async () => {
    const n = await newPtmNotice("Integration: audio");
    await generateTranslation(teacher, n.id, "gu");
    const audio = await generateAudio(teacher, n.id, "gu");
    expect(["READY", "SIMULATED"]).toContain(audio.status);
    await editTranslation(teacher, n.id, "gu", `${ptm.translations.gu} `.trim() + " ");
    const after = await db.noticeAudio.findUniqueOrThrow({ where: { id: audio.id } });
    expect(after.status).toBe("STALE");
  });

  it("school admins can view notices but not approve them", async () => {
    const n = await noticeByTitle("PTM reminder for 5-B");
    await expect(getNoticeForActor(admin, n.id)).resolves.toBeTruthy();
    await expect(approveNotice(admin, n.id)).rejects.toMatchObject({ status: 403 });
  });
});
