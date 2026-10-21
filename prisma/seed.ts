/**
 * Seeds a fictional Devbhumi Dwarka demo dataset. Every school, person, phone
 * number and figure here is invented. Notices are driven through the real
 * service layer (create → translate → validate → approve → dispatch) with the
 * demo providers, then their timestamps are moved into the past so dashboards
 * have history. No real message is sent.
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth/password";
import { ACADEMIC_YEAR, DEMO_DISTRICT, type Language, type Role } from "../lib/domain/constants";
import type { Actor } from "../lib/permissions";
import { DEMO_SAMPLES, PTM_GU_WRONG_DATE, PTM_HI_MISSING_ITEM } from "../services/ai/demo-content";
import {
  approveNotice,
  createNotice,
  editTranslation,
  generateAudio,
  generateTranslation,
  simplifyNotice,
  submitNotice,
  validateNotice,
} from "../services/notices";
import { dispatchNotice } from "../services/notices/dispatch";

const db = new PrismaClient({ transactionOptions: { maxWait: 10_000, timeout: 30_000 } });
const PASSWORD = process.env.SEED_DEMO_PASSWORD || "ValiSetu@2026";
const NOW = new Date("2026-10-21T10:00:00Z");
const DAY = 24 * 3600 * 1000;

/** Small deterministic PRNG so every seed produces the same dataset. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}
const rand = rng(20261021);

const FIRST = ["Meena", "Ramesh", "Kanta", "Bharat", "Hetal", "Jayesh", "Rekha", "Nilesh", "Sonal", "Dinesh", "Geeta", "Pravin", "Asha", "Mahesh", "Nirmala", "Vipul", "Kokila", "Hitesh", "Daksha", "Suresh", "Farzana", "Imran", "Sunita", "Rajesh"];
const LAST = ["Parmar", "Chavda", "Makwana", "Solanki", "Vaghela", "Patel", "Jadeja", "Gohil", "Rathod", "Dabhi", "Sumra", "Bhatt", "Kanzariya", "Nakum", "Gadhvi", "Yadav", "Sharma", "Ansari"];

interface SchoolSeed {
  code: string;
  name: string;
  nameGu: string;
  block: string;
  cluster: string;
  classes: [number, string][];
  perClass: number;
}

const SCHOOLS: SchoolSeed[] = [
  { code: "DEMO-KH-001", name: "Setu Demo Primary School, Navagam", nameGu: "સેતુ ડેમો પ્રાથમિક શાળા, નવાગામ", block: "Khambhalia", cluster: "Khambhalia-1", classes: [[5, "A"], [5, "B"], [6, "A"], [7, "A"], [8, "A"], [9, "A"]], perClass: 12 },
  { code: "DEMO-KH-002", name: "Demo Prathmik Shala, Ramnagar", nameGu: "ડેમો પ્રાથમિક શાળા, રામનગર", block: "Khambhalia", cluster: "Khambhalia-1", classes: [[5, "A"], [6, "A"], [7, "A"]], perClass: 9 },
  { code: "DEMO-KH-003", name: "Demo Kanya Shala, Sonpur", nameGu: "ડેમો કન્યા શાળા, સોનપુર", block: "Khambhalia", cluster: "Khambhalia-2", classes: [[5, "A"], [6, "A"], [8, "A"]], perClass: 8 },
  { code: "DEMO-KL-001", name: "Demo Primary School, Moti Vadi", nameGu: "ડેમો પ્રાથમિક શાળા, મોટી વાડી", block: "Kalyanpur", cluster: "Kalyanpur-1", classes: [[5, "A"], [6, "A"], [7, "A"]], perClass: 9 },
  { code: "DEMO-KL-002", name: "Demo Prathmik Shala, Shivpura", nameGu: "ડેમો પ્રાથમિક શાળા, શિવપુરા", block: "Kalyanpur", cluster: "Kalyanpur-1", classes: [[5, "A"], [7, "A"]], perClass: 8 },
  { code: "DEMO-DW-001", name: "Demo Primary School, Gopalpur", nameGu: "ડેમો પ્રાથમિક શાળા, ગોપાલપુર", block: "Dwarka", cluster: "Dwarka-1", classes: [[5, "A"], [6, "A"], [8, "A"]], perClass: 9 },
  { code: "DEMO-DW-002", name: "Demo Upper Primary School, Laxmipura", nameGu: "ડેમો ઉચ્ચ પ્રાથમિક શાળા, લક્ષ્મીપુરા", block: "Dwarka", cluster: "Dwarka-1", classes: [[6, "A"], [7, "A"], [8, "A"]], perClass: 8 },
  { code: "DEMO-BH-001", name: "Demo Prathmik Shala, Haripar", nameGu: "ડેમો પ્રાથમિક શાળા, હરિપર", block: "Bhanvad", cluster: "Bhanvad-1", classes: [[5, "A"], [6, "A"], [7, "A"]], perClass: 8 },
];

function actorOf(u: { id: string; role: string; schoolId: string | null; cluster: string | null; block: string | null; district: string | null; canApprove: boolean }): Actor {
  return { id: u.id, role: u.role as Role, schoolId: u.schoolId, cluster: u.cluster, block: u.block, district: u.district, canApprove: u.canApprove };
}

async function main() {
  console.log("Resetting demo data…");
  // Order respects foreign keys.
  for (const table of [
    "auditLog", "rateLimitBucket", "messageDeliveryAttempt", "noticeRecipient", "dispatchRequest", "parentResponse", "followUpTask",
    "noticeAudio", "noticeValidation", "translationRevision", "noticeTranslation", "noticeVersion", "noticeClass", "notice",
    "teacherAssignment", "studentGuardian", "student", "session", "parentGuardian", "user", "classSection", "school",
  ] as const) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any)[table].deleteMany();
  }

  const passwordHash = await hashPassword(PASSWORD);
  const schools = [];
  for (const s of SCHOOLS) {
    schools.push(
      await db.school.create({
        data: {
          code: s.code,
          name: s.name,
          nameGu: s.nameGu,
          district: DEMO_DISTRICT,
          block: s.block,
          cluster: s.cluster,
          address: `${s.name.split(", ")[1]} village, ${s.block} taluka (fictional address)`,
          helpline: `0283${schools.length}-000${100 + schools.length}`,
        },
      }),
    );
  }
  const main = schools[0]!;

  // Classes, students and guardians -----------------------------------------
  const classMap = new Map<string, string>(); // `${schoolCode}:${grade}${section}` -> id
  const guardianByStudent = new Map<string, string>();
  let phoneCounter = 10000;
  let guardianIndex = 0;
  for (const [si, s] of SCHOOLS.entries()) {
    const school = schools[si]!;
    for (const [grade, section] of s.classes) {
      const cls = await db.classSection.create({ data: { schoolId: school.id, grade, section, academicYear: ACADEMIC_YEAR } });
      classMap.set(`${s.code}:${grade}${section}`, cls.id);
      for (let roll = 1; roll <= s.perClass; roll += 1) {
        const student = await db.student.create({
          data: { schoolId: school.id, classSectionId: cls.id, displayName: `Student ${grade}${section}-${String(roll).padStart(2, "0")}`, rollNumber: roll },
        });
        const r = rand();
        const lang: Language = r < 0.68 ? "gu" : r < 0.9 ? "hi" : "en";
        const c = rand();
        const channel = c < 0.6 ? "whatsapp" : c < 0.88 ? "sms" : "voice";
        const consent = rand();
        const hasPhone = rand() > 0.04;
        phoneCounter += 1;
        const guardian = await db.parentGuardian.create({
          data: {
            displayName: `${FIRST[guardianIndex % FIRST.length]} ${LAST[(guardianIndex * 7) % LAST.length]}`,
            preferredLanguage: lang,
            preferredChannel: channel,
            consentStatus: consent < 0.93 ? "GRANTED" : consent < 0.97 ? "PENDING" : "WITHDRAWN",
            consentUpdatedAt: new Date(NOW.getTime() - 60 * DAY),
            phone: hasPhone ? `+91 90000 ${String(phoneCounter).padStart(5, "0")}` : null,
            phoneVerified: hasPhone,
            notificationPrefs: JSON.stringify({ urgentOnly: false, voice: channel === "voice" }),
          },
        });
        guardianIndex += 1;
        await db.studentGuardian.create({
          data: { studentId: student.id, guardianId: guardian.id, relationship: guardianIndex % 3 === 0 ? "FATHER" : guardianIndex % 3 === 1 ? "MOTHER" : "GUARDIAN" },
        });
        guardianByStudent.set(`${s.code}:${grade}${section}-${roll}`, guardian.id);
      }
    }
  }

  // Users -------------------------------------------------------------------
  const mk = (data: { email: string; name: string; role: Role; schoolId?: string; cluster?: string; block?: string; district?: string; canApprove?: boolean; locale?: string }) =>
    db.user.create({ data: { passwordHash, locale: "en", ...data } });

  const teacher = await mk({ email: "teacher@valisetu.example", name: "Asha Desai", role: "TEACHER", schoolId: main.id });
  const teacher2 = await mk({ email: "teacher2@valisetu.example", name: "Rakesh Joshi", role: "TEACHER", schoolId: main.id, canApprove: true });
  const head = await mk({ email: "headteacher@valisetu.example", name: "Kiran Mehta", role: "HEAD_TEACHER", schoolId: main.id });
  await mk({ email: "admin@valisetu.example", name: "Farida Shaikh", role: "SCHOOL_ADMIN", schoolId: main.id });
  await mk({ email: "crc@valisetu.example", name: "Vijay Nakum", role: "CRC_OFFICER", district: DEMO_DISTRICT, block: "Khambhalia", cluster: "Khambhalia-1" });
  await mk({ email: "brc@valisetu.example", name: "Sejal Trivedi", role: "BRC_OFFICER", district: DEMO_DISTRICT, block: "Khambhalia" });
  await mk({ email: "district@valisetu.example", name: "Anil Bhatt", role: "DISTRICT_OFFICIAL", district: DEMO_DISTRICT, locale: "en" });

  const assign = async (userId: string, schoolCode: string, keys: string[]) => {
    for (const k of keys) await db.teacherAssignment.create({ data: { userId, classSectionId: classMap.get(`${schoolCode}:${k}`)! } });
  };
  await assign(teacher.id, "DEMO-KH-001", ["5A", "5B"]);
  await assign(teacher2.id, "DEMO-KH-001", ["6A", "9A"]);

  // Parent accounts linked to fictional guardians in class 5-A of the main school.
  const parentGu = guardianByStudent.get("DEMO-KH-001:5A-1")!;
  const parentHi = guardianByStudent.get("DEMO-KH-001:5A-2")!;
  await db.parentGuardian.update({ where: { id: parentGu }, data: { displayName: "Meena Parmar", preferredLanguage: "gu", preferredChannel: "whatsapp", consentStatus: "GRANTED", phone: "+91 90000 00011", phoneVerified: true } });
  await db.parentGuardian.update({ where: { id: parentHi }, data: { displayName: "Sunita Yadav", preferredLanguage: "hi", preferredChannel: "sms", consentStatus: "GRANTED", phone: "+91 90000 00012", phoneVerified: true } });
  await db.user.create({ data: { email: "parent@valisetu.example", name: "Meena Parmar", role: "PARENT", passwordHash, locale: "gu", guardian: { connect: { id: parentGu } } } });
  await db.user.create({ data: { email: "parent.hi@valisetu.example", name: "Sunita Yadav", role: "PARENT", passwordHash, locale: "hi", guardian: { connect: { id: parentHi } } } });

  // A head teacher per other school so their notices have a real creator and approver.
  const heads = new Map<string, Actor>([[main.id, actorOf(head)]]);
  for (const school of schools.slice(1)) {
    const h = await mk({ email: `head.${school.code.toLowerCase()}@valisetu.example`, name: `Head Teacher ${school.code}`, role: "HEAD_TEACHER", schoolId: school.id });
    heads.set(school.id, actorOf(h));
  }

  const tActor = actorOf(teacher);
  const t2Actor = actorOf(teacher2);
  const headActor = actorOf(head);

  // Notices via the real workflow ---------------------------------------------
  const sample = (key: string) => DEMO_SAMPLES.find((s) => s.key === key)!;

  async function prepare(actor: Actor, key: string, classKeys: string[], schoolCode: string, opts: { title?: string; languages?: Language[]; channels?: ("whatsapp" | "sms" | "voice")[]; priority?: "NORMAL" | "HIGH" | "URGENT" } = {}) {
    const s = sample(key);
    const languages = opts.languages ?? ["gu", "hi", "en"];
    const notice = await createNotice(actor, {
      title: opts.title ?? s.title,
      category: s.category,
      sourceText: s.source,
      sourceLanguage: "en",
      priority: opts.priority ?? (key === "ptm" ? "HIGH" : "NORMAL"),
      classSectionIds: classKeys.map((k) => classMap.get(`${schoolCode}:${k}`)!),
      recipientMode: "CLASS",
      selectedGuardianIds: [],
      targetLanguages: languages,
      channels: opts.channels ?? ["whatsapp", "sms", "voice"],
    });
    await simplifyNotice(actor, notice.id);
    for (const l of languages) {
      await generateTranslation(actor, notice.id, l);
      await generateAudio(actor, notice.id, l);
    }
    await validateNotice(actor, notice.id);
    return notice;
  }

  async function complete(noticeId: string, creator: Actor, approver: Actor, dispatchAt: Date | null) {
    await submitNotice(creator, noticeId);
    await approveNotice(approver, noticeId);
    if (dispatchAt) await dispatchNotice(approver, noticeId, `seed-${noticeId}`);
  }

  /** Shift every timestamp belonging to a notice so it looks like it happened at `at`. */
  async function backdate(noticeId: string, at: Date) {
    const n = await db.notice.findUniqueOrThrow({ where: { id: noticeId } });
    const shift = (d: Date | null) => (d ? new Date(d.getTime() - (n.createdAt.getTime() - (at.getTime() - 3 * DAY))) : null);
    await db.notice.update({
      where: { id: noticeId },
      data: { createdAt: shift(n.createdAt)!, approvedAt: shift(n.approvedAt), dispatchedAt: n.dispatchedAt ? at : null },
    });
    await db.noticeVersion.updateMany({ where: { noticeId }, data: { createdAt: shift(n.createdAt)! } });
    const recipients = await db.noticeRecipient.findMany({ where: { noticeId } });
    for (const r of recipients) {
      await db.noticeRecipient.update({
        where: { id: r.id },
        data: { sentAt: r.sentAt ? at : null, deliveredAt: r.deliveredAt ? new Date(at.getTime() + 5 * 60000) : null, lastAttemptAt: r.lastAttemptAt ? at : null },
      });
      await db.messageDeliveryAttempt.updateMany({ where: { recipientId: r.id }, data: { createdAt: at } });
    }
    await db.dispatchRequest.updateMany({ where: { noticeId }, data: { createdAt: at } });
    await db.followUpTask.updateMany({ where: { noticeId }, data: { createdAt: at, dueAt: new Date(at.getTime() + 2 * DAY) } });
    const logs = await db.auditLog.findMany({ where: { OR: [{ entityId: noticeId }, { metadata: { contains: noticeId } }] }, orderBy: { timestamp: "asc" } });
    for (const [i, log] of logs.entries()) {
      const ts = log.action.startsWith("notice.dispatched") ? at : new Date(at.getTime() - 3 * DAY + i * 15 * 60000);
      await db.auditLog.update({ where: { id: log.id }, data: { timestamp: ts } });
    }
  }

  /** Simulated parent activity: reads, audio plays, acknowledgments and a few questions. */
  async function engage(noticeId: string, at: Date, ackRate: number, questionRate: number) {
    const n = await db.notice.findUniqueOrThrow({ where: { id: noticeId }, select: { schoolId: true } });
    const delivered = await db.noticeRecipient.findMany({ where: { noticeId, deliveryStatus: "DELIVERED" } });
    const doneGuardians = new Set<string>();
    for (const r of delivered) {
      if (doneGuardians.has(r.guardianId)) continue;
      if (r.guardianId === parentGu || r.guardianId === parentHi) continue; // left for the live demo
      doneGuardians.add(r.guardianId);
      const readAt = rand() < 0.85 ? new Date(at.getTime() + (1 + rand() * 20) * 3600000) : null;
      if (!readAt) continue;
      const audioPlayedAt = r.channel !== "sms" && rand() < 0.5 ? new Date(readAt.getTime() + 60000) : null;
      const ack = rand() < ackRate;
      await db.noticeRecipient.updateMany({
        where: { noticeId, guardianId: r.guardianId },
        data: { readAt, audioPlayedAt, acknowledgedAt: ack ? new Date(readAt.getTime() + 120000) : null },
      });
      if (ack) {
        await db.parentResponse.create({ data: { noticeId, guardianId: r.guardianId, schoolId: n.schoolId, responseType: "ACKNOWLEDGED", status: "RECORDED", createdAt: new Date(readAt.getTime() + 120000) } });
      } else if (rand() < questionRate) {
        const cats = ["DATE_TIME", "DOCUMENTS", "CANNOT_ATTEND", "NOT_UNDERSTOOD"] as const;
        const answered = rand() < 0.5;
        await db.parentResponse.create({
          data: {
            noticeId,
            guardianId: r.guardianId,
            schoolId: n.schoolId,
            responseType: "QUESTION",
            questionCategory: cats[Math.floor(rand() * cats.length)],
            message: "Please call me to explain.",
            callbackRequested: true,
            status: answered ? "ANSWERED" : "OPEN",
            staffReply: answered ? "Called the family and explained the notice." : null,
            createdAt: new Date(readAt.getTime() + 300000),
          },
        });
      }
    }
  }

  const dated = (daysAgo: number, hourIst = 10) => new Date(Date.UTC(2026, 9, 21 - daysAgo) + (hourIst - 5.5) * 3600000);

  console.log("Seeding main school notices…");
  // Scenario A: PTM dispatched to 5-A and 5-B.
  const ptm = await prepare(tActor, "ptm", ["5A", "5B"], "DEMO-KH-001");
  await complete(ptm.id, tActor, headActor, dated(7));
  await backdate(ptm.id, dated(7));
  await engage(ptm.id, dated(7), 0.66, 0.25);
  // Scenario E: Hindi-speaking parent asks about the meeting time.
  await db.noticeRecipient.updateMany({ where: { noticeId: ptm.id, guardianId: parentHi }, data: { readAt: dated(6, 18), deliveryStatus: "DELIVERED" } });
  await db.parentResponse.create({
    data: {
      noticeId: ptm.id,
      guardianId: parentHi,
      schoolId: main.id,
      responseType: "QUESTION",
      questionCategory: "DATE_TIME",
      message: "क्या बैठक सुबह 11 बजे है या दोपहर में? मैं काम पर रहती हूँ।",
      callbackRequested: true,
      status: "OPEN",
      clientKey: "seed-scenario-e",
      createdAt: dated(6, 18),
    },
  });

  // Scholarship to class 9-A by teacher2, approved by head teacher.
  const sch = await prepare(t2Actor, "scholarship", ["9A"], "DEMO-KH-001", { channels: ["whatsapp", "sms"] });
  await complete(sch.id, t2Actor, headActor, dated(14));
  await backdate(sch.id, dated(14));
  await engage(sch.id, dated(14), 0.6, 0.3);

  // Holiday notice to the whole school (earlier).
  const hol = await prepare(headActor, "holiday", ["5A", "5B", "6A", "7A", "8A", "9A"], "DEMO-KH-001", { channels: ["whatsapp", "sms"] });
  await complete(hol.id, headActor, headActor, dated(20));
  await backdate(hol.id, dated(20));
  await engage(hol.id, dated(20), 0.72, 0.05);

  // Exam timetable: approved, waiting for dispatch.
  const exam = await prepare(headActor, "exam", ["6A", "7A", "8A"], "DEMO-KH-001", { channels: ["whatsapp", "sms"] });
  await complete(exam.id, headActor, headActor, null);
  await backdate(exam.id, dated(1));

  // Scenario B: Gujarati translation with the wrong date, waiting for approval.
  const wrong = await prepare(tActor, "ptm", ["5B"], "DEMO-KH-001", { title: "PTM reminder for 5-B (check Gujarati date)", channels: ["whatsapp", "sms"] });
  await editTranslation(tActor, wrong.id, "gu", PTM_GU_WRONG_DATE);
  await generateAudio(tActor, wrong.id, "gu");
  await validateNotice(tActor, wrong.id);
  await submitNotice(tActor, wrong.id);
  await backdate(wrong.id, dated(1));

  // Scenario C: Hindi version that dropped the report-card instruction (draft).
  const missing = await prepare(tActor, "ptm", ["5A"], "DEMO-KH-001", { title: "PTM reminder for 5-A (Hindi needs review)", channels: ["whatsapp", "sms"] });
  await editTranslation(tActor, missing.id, "hi", PTM_HI_MISSING_ITEM);
  await validateNotice(tActor, missing.id);
  await backdate(missing.id, NOW);

  // A plain draft with no translations yet.
  await createNotice(tActor, {
    title: "Annual sports day volunteers",
    category: "EVENT",
    sourceText: "Annual sports day will be held on 14 December 2026 at 8:30 AM on the school ground. Parents who wish to volunteer may contact the class teacher by 5 December 2026.",
    sourceLanguage: "en",
    priority: "NORMAL",
    classSectionIds: [classMap.get("DEMO-KH-001:5A")!],
    recipientMode: "CLASS",
    selectedGuardianIds: [],
    targetLanguages: ["gu", "hi", "en"],
    channels: ["whatsapp"],
  });

  console.log("Seeding other schools…");
  const plan: [string, number, number][] = [
    ["holiday", 22, 0.7],
    ["exam", 12, 0.62],
    ["ptm", 6, 0.55],
    ["scholarship", 16, 0.5],
  ];
  for (const [si, s] of SCHOOLS.entries()) {
    if (si === 0) continue;
    const school = schools[si]!;
    const actor = heads.get(school.id)!;
    // Give the head teacher assignments implicitly via school scope (head teachers see all classes).
    const classes = s.classes.map(([g, sec]) => `${g}${sec}`);
    const count = 2 + (si % 3);
    for (let i = 0; i < count; i += 1) {
      const [key, daysAgo, ack] = plan[(si + i) % plan.length]!;
      const n = await prepare(actor, key, key === "scholarship" ? classes.slice(-1) : classes, s.code, {
        channels: si % 2 ? ["whatsapp", "sms"] : ["sms", "voice", "whatsapp"],
      });
      await complete(n.id, actor, actor, dated(daysAgo + si));
      await backdate(n.id, dated(daysAgo + si));
      // Some schools engage less, so the follow-up indicators have something to show.
      await engage(n.id, dated(daysAgo + si), si === 4 ? 0.3 : ack, si === 6 ? 0.35 : 0.12);
    }
  }

  // Close some follow-ups so status filters are meaningful.
  const tasks = await db.followUpTask.findMany({ orderBy: { id: "asc" } });
  for (const [i, t] of tasks.entries()) {
    if (i % 3 === 0) await db.followUpTask.update({ where: { id: t.id }, data: { status: "DONE", completedAt: NOW } });
  }

  await db.rateLimitBucket.deleteMany();
  const counts = {
    schools: await db.school.count(),
    guardians: await db.parentGuardian.count(),
    notices: await db.notice.count(),
    recipients: await db.noticeRecipient.count(),
    responses: await db.parentResponse.count(),
  };
  console.log("Done.", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
