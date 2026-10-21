import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { can, schoolScope, type Actor } from "@/lib/permissions";
import { percent } from "@/lib/utils";
import { ForbiddenError } from "@/services/errors";

export interface AnalyticsFilters {
  schoolId?: string;
  block?: string;
  classSectionId?: string;
  section?: string;
  language?: string;
  channel?: string;
  category?: string;
  status?: string;
  from?: Date;
  to?: Date;
}

/**
 * Definitions used everywhere a rate is shown (also rendered on dashboards):
 * - Delivery rate = delivered / messages attempted (skipped messages excluded).
 * - Acknowledgment rate = families who tapped "I understand" / families delivered to.
 * - Read and audio events are recorded app events, not proof of comprehension.
 */
export const METHODOLOGY = [
  "Delivery rate = messages with a delivery confirmation ÷ messages attempted. Messages skipped for missing consent or contact are excluded and counted separately.",
  "Acknowledgment rate = families who pressed “I understand” ÷ families whose message was delivered.",
  "Read and audio-played are app events. They do not prove the parent understood the message.",
  "Figures come from the fictional demo dataset and are not official statistics. They are not a ranking of schools.",
];

type RecipientRow = Prisma.NoticeRecipientGetPayload<{
  select: {
    id: true;
    guardianId: true;
    channel: true;
    language: true;
    deliveryStatus: true;
    readAt: true;
    audioPlayedAt: true;
    acknowledgedAt: true;
    lastAttemptAt: true;
    notice: { select: { id: true; schoolId: true; category: true; dispatchedAt: true } };
  };
}>;

function recipientWhere(schoolIds: string[], f: AnalyticsFilters): Prisma.NoticeRecipientWhereInput {
  return {
    notice: {
      schoolId: { in: f.schoolId ? schoolIds.filter((s) => s === f.schoolId) : schoolIds },
      workflowStatus: "DISPATCHED",
      ...(f.category ? { category: f.category } : {}),
      ...(f.from || f.to ? { dispatchedAt: { ...(f.from ? { gte: f.from } : {}), ...(f.to ? { lte: f.to } : {}) } } : {}),
      ...(f.classSectionId ? { classes: { some: { classSectionId: f.classSectionId } } } : {}),
    },
    ...(f.language ? { language: f.language } : {}),
    ...(f.channel ? { channel: f.channel } : {}),
    ...(f.section ? { guardian: { students: { some: { student: { classSection: { section: f.section } } } } } } : {}),
  };
}

const recipientSelect = {
  id: true,
  guardianId: true,
  channel: true,
  language: true,
  deliveryStatus: true,
  readAt: true,
  audioPlayedAt: true,
  acknowledgedAt: true,
  lastAttemptAt: true,
  notice: { select: { id: true, schoolId: true, category: true, dispatchedAt: true } },
} satisfies Prisma.NoticeRecipientSelect;

function summarize(rows: RecipientRow[]) {
  const attempted = rows.filter((r) => r.deliveryStatus !== "SKIPPED");
  const delivered = rows.filter((r) => r.deliveryStatus === "DELIVERED");
  const deliveredFamilies = new Set(delivered.map((r) => `${r.notice.id}:${r.guardianId}`));
  const ackFamilies = new Set(rows.filter((r) => r.acknowledgedAt).map((r) => `${r.notice.id}:${r.guardianId}`));
  return {
    attempted: attempted.length,
    delivered: delivered.length,
    failed: rows.filter((r) => r.deliveryStatus === "FAILED").length,
    skipped: rows.filter((r) => r.deliveryStatus === "SKIPPED").length,
    awaiting: rows.filter((r) => r.deliveryStatus === "QUEUED" || r.deliveryStatus === "SENT").length,
    read: rows.filter((r) => r.readAt).length,
    audioPlayed: rows.filter((r) => r.audioPlayedAt).length,
    acknowledged: ackFamilies.size,
    deliveryRate: percent(delivered.length, attempted.length),
    failureRate: percent(rows.filter((r) => r.deliveryStatus === "FAILED").length, attempted.length),
    ackRate: percent([...ackFamilies].filter((k) => deliveredFamilies.has(k)).length, deliveredFamilies.size),
  };
}

function weekStart(d: Date): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = (x.getUTCDay() + 6) % 7; // Monday = 0
  x.setUTCDate(x.getUTCDate() - day);
  return x.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// School level
// ---------------------------------------------------------------------------

export async function schoolAnalytics(actor: Actor, f: AnalyticsFilters) {
  if (!can(actor, "reports.school") || !actor.schoolId) throw new ForbiddenError();
  const schoolId = actor.schoolId;
  const where = recipientWhere([schoolId], f);
  const rows = await db.noticeRecipient.findMany({ where, select: recipientSelect });
  const s = summarize(rows);
  const [families, noticesSent, questions, followUpFamilies] = await Promise.all([
    db.parentGuardian.count({ where: { students: { some: { authStatus: "AUTHORIZED", student: { schoolId, status: "ACTIVE" } } } } }),
    db.notice.count({ where: { schoolId, workflowStatus: "DISPATCHED", ...(f.category ? { category: f.category } : {}) } }),
    db.parentResponse.count({ where: { schoolId, responseType: "QUESTION", ...(f.from ? { createdAt: { gte: f.from } } : {}) } }),
    db.followUpTask.findMany({ where: { schoolId, status: "OPEN", guardianId: { not: null } }, distinct: ["guardianId"], select: { guardianId: true } }),
  ]);
  return {
    metrics: {
      families,
      noticesSent,
      delivered: s.delivered,
      awaiting: s.awaiting,
      readOrAcknowledged: rows.filter((r) => r.readAt || r.acknowledgedAt).length,
      audioPlayed: s.audioPlayed,
      questions,
      followUpFamilies: followUpFamilies.length,
      deliveryRate: s.deliveryRate,
      ackRate: s.ackRate,
    },
  };
}

export async function schoolDeliveryTable(actor: Actor, f: AnalyticsFilters, page = 1, pageSize = 20) {
  if (!can(actor, "reports.school") && !can(actor, "responses.manage")) throw new ForbiddenError();
  if (!actor.schoolId) throw new ForbiddenError();
  const where: Prisma.NoticeRecipientWhereInput = {
    ...recipientWhere([actor.schoolId], f),
    ...(f.status ? statusFilter(f.status) : {}),
  };
  const [total, rows] = await Promise.all([
    db.noticeRecipient.count({ where }),
    db.noticeRecipient.findMany({
      where,
      orderBy: [{ lastAttemptAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        notice: { select: { id: true, title: true, category: true } },
        guardian: {
          select: {
            id: true,
            displayName: true,
            preferredLanguage: true,
            students: { select: { student: { select: { classSection: { select: { grade: true, section: true } } } } } },
            responses: { select: { noticeId: true, responseType: true, status: true } },
            followUps: { where: { status: "OPEN" }, select: { id: true, noticeId: true } },
          },
        },
      },
    }),
  ]);
  return {
    total,
    page,
    pageSize,
    rows: rows.map((r) => {
      const question = r.guardian.responses.find((x) => x.noticeId === r.noticeId && x.responseType === "QUESTION");
      const followUp = r.guardian.followUps.find((x) => x.noticeId === r.noticeId);
      const cls = r.guardian.students[0]?.student.classSection;
      return {
        id: r.id,
        guardianId: r.guardian.id,
        guardianName: r.guardian.displayName,
        className: cls ? `${cls.grade}-${cls.section}` : "—",
        language: r.language,
        channel: r.channel,
        deliveryStatus: r.deliveryStatus,
        readAt: r.readAt,
        audioPlayedAt: r.audioPlayedAt,
        acknowledgedAt: r.acknowledgedAt,
        questionStatus: question?.status ?? null,
        lastActivity: [r.acknowledgedAt, r.audioPlayedAt, r.readAt, r.lastAttemptAt].filter(Boolean).sort((a, b) => b!.getTime() - a!.getTime())[0] ?? null,
        noticeId: r.notice.id,
        noticeTitle: r.notice.title,
        followUpOpen: Boolean(followUp),
        needsFollowUp: Boolean(followUp) || r.deliveryStatus === "FAILED" || r.deliveryStatus === "SKIPPED" || question?.status === "OPEN",
      };
    }),
  };
}

/** Status filter values map to distinct, non-interchangeable events. */
function statusFilter(status: string): Prisma.NoticeRecipientWhereInput {
  switch (status) {
    case "QUEUED":
    case "SENT":
    case "DELIVERED":
    case "FAILED":
    case "SKIPPED":
      return { deliveryStatus: status };
    case "READ":
      return { readAt: { not: null } };
    case "AUDIO_PLAYED":
      return { audioPlayedAt: { not: null } };
    case "ACKNOWLEDGED":
      return { acknowledgedAt: { not: null } };
    case "NOT_ACKNOWLEDGED":
      return { acknowledgedAt: null, deliveryStatus: "DELIVERED" };
    default:
      return {};
  }
}

// ---------------------------------------------------------------------------
// CRC / BRC / district level (aggregates only, no contact details)
// ---------------------------------------------------------------------------

export async function regionAnalytics(actor: Actor, f: AnalyticsFilters) {
  if (!can(actor, "reports.region")) throw new ForbiddenError();
  const scope = schoolScope(actor);
  const schools = await db.school.findMany({
    where: { AND: [scope, f.block ? { block: f.block } : {}, f.schoolId ? { id: f.schoolId } : {}] },
    orderBy: [{ block: "asc" }, { name: "asc" }],
    select: { id: true, name: true, code: true, block: true, cluster: true },
  });
  const ids = schools.map((s) => s.id);
  const rows = await db.noticeRecipient.findMany({ where: recipientWhere(ids, f), select: recipientSelect });
  const [familyLinks, notices, openQuestions, openFollowUps] = await Promise.all([
    db.studentGuardian.findMany({
      where: { authStatus: "AUTHORIZED", student: { schoolId: { in: ids }, status: "ACTIVE" } },
      select: { guardianId: true, student: { select: { schoolId: true } }, guardian: { select: { preferredLanguage: true } } },
    }),
    db.notice.findMany({
      where: { schoolId: { in: ids }, workflowStatus: "DISPATCHED", ...(f.category ? { category: f.category } : {}), ...(f.from || f.to ? { dispatchedAt: { ...(f.from ? { gte: f.from } : {}), ...(f.to ? { lte: f.to } : {}) } } : {}) },
      select: { id: true, schoolId: true, dispatchedAt: true, category: true },
    }),
    db.parentResponse.groupBy({ by: ["schoolId"], where: { schoolId: { in: ids }, responseType: "QUESTION", status: "OPEN" }, _count: { _all: true } }),
    db.followUpTask.groupBy({ by: ["schoolId"], where: { schoolId: { in: ids }, status: "OPEN" }, _count: { _all: true } }),
  ]);

  const familiesBySchool = new Map<string, Set<string>>();
  for (const l of familyLinks) {
    const set = familiesBySchool.get(l.student.schoolId) ?? new Set();
    set.add(l.guardianId);
    familiesBySchool.set(l.student.schoolId, set);
  }
  const questionsBySchool = new Map(openQuestions.map((q) => [q.schoolId, q._count._all]));
  const followUpsBySchool = new Map(openFollowUps.map((q) => [q.schoolId, q._count._all]));

  const schoolRows = schools.map((school) => {
    const sRows = rows.filter((r) => r.notice.schoolId === school.id);
    const s = summarize(sRows);
    const pending = questionsBySchool.get(school.id) ?? 0;
    const followUps = followUpsBySchool.get(school.id) ?? 0;
    return {
      ...school,
      families: familiesBySchool.get(school.id)?.size ?? 0,
      noticesSent: notices.filter((n) => n.schoolId === school.id).length,
      deliveryRate: s.deliveryRate,
      ackRate: s.ackRate,
      failureRate: s.failureRate,
      pendingQuestions: pending,
      openFollowUps: followUps,
      // A school "needs follow-up" by a stated rule, not a judgement of the school.
      needsFollowUp: (s.attempted > 0 && (s.deliveryRate < 80 || s.ackRate < 50)) || pending >= 3,
    };
  });

  const total = summarize(rows);
  const byLanguage = groupRate(rows, (r) => r.language);
  const byChannel = groupRate(rows, (r) => r.channel);
  const languageFamilies: Record<string, number> = {};
  const seenFamily = new Set<string>();
  for (const l of familyLinks) {
    if (seenFamily.has(l.guardianId)) continue;
    seenFamily.add(l.guardianId);
    languageFamilies[l.guardian.preferredLanguage] = (languageFamilies[l.guardian.preferredLanguage] ?? 0) + 1;
  }

  const weeks = new Map<string, { notices: number; delivered: number; acknowledged: number; schools: Set<string> }>();
  for (const n of notices) {
    if (!n.dispatchedAt) continue;
    const w = weekStart(n.dispatchedAt);
    const e = weeks.get(w) ?? { notices: 0, delivered: 0, acknowledged: 0, schools: new Set() };
    e.notices += 1;
    e.schools.add(n.schoolId);
    weeks.set(w, e);
  }
  for (const r of rows) {
    if (!r.notice.dispatchedAt) continue;
    const e = weeks.get(weekStart(r.notice.dispatchedAt));
    if (!e) continue;
    if (r.deliveryStatus === "DELIVERED") e.delivered += 1;
    if (r.acknowledgedAt) e.acknowledged += 1;
  }
  const covered = new Set<string>();
  const weekly = [...weeks.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, e]) => {
      e.schools.forEach((s) => covered.add(s));
      return {
        week,
        notices: e.notices,
        engagement: percent(e.acknowledged, e.delivered),
        schoolsCovered: covered.size,
      };
    });

  return {
    schools: schoolRows,
    blocks: [...new Set(schools.map((s) => s.block))],
    metrics: {
      schools: schools.length,
      families: seenFamily.size,
      noticesSent: notices.length,
      reach: new Set(rows.filter((r) => r.deliveryStatus === "DELIVERED").map((r) => r.guardianId)).size,
      deliveryRate: total.deliveryRate,
      failureRate: total.failureRate,
      failures: total.failed,
      ackRate: total.ackRate,
      unresolvedQuestions: openQuestions.reduce((a, q) => a + q._count._all, 0),
      schoolsNeedingFollowUp: schoolRows.filter((s) => s.needsFollowUp).length,
    },
    byLanguage,
    byChannel,
    languageFamilies,
    weekly,
  };
}

function groupRate(rows: RecipientRow[], key: (r: RecipientRow) => string) {
  const groups = new Map<string, RecipientRow[]>();
  for (const r of rows) groups.set(key(r), [...(groups.get(key(r)) ?? []), r]);
  return [...groups.entries()].map(([k, list]) => {
    const s = summarize(list);
    return { key: k, attempted: s.attempted, delivered: s.delivered, deliveryRate: s.deliveryRate, ackRate: s.ackRate };
  });
}

/** One school's detail for a regional officer: aggregates only. */
export async function regionSchoolDetail(actor: Actor, schoolId: string) {
  const data = await regionAnalytics(actor, { schoolId });
  const school = data.schools[0];
  if (!school) return null;
  const notices = await db.notice.findMany({
    where: { schoolId, workflowStatus: "DISPATCHED" },
    orderBy: { dispatchedAt: "desc" },
    take: 20,
    select: { id: true, title: true, category: true, dispatchedAt: true, _count: { select: { recipients: true, responses: true } } },
  });
  return { school, notices, byLanguage: data.byLanguage, byChannel: data.byChannel, weekly: data.weekly };
}
