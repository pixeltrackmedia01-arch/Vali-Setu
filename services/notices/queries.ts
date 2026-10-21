import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { noticeScope, type Actor } from "@/lib/permissions";
import { percent } from "@/lib/utils";

const PAGE_SIZE = 10;

export async function listNotices(actor: Actor, f: { search?: string; status?: string; category?: string; page?: number; from?: Date; to?: Date; language?: string; channel?: string }) {
  const where: Prisma.NoticeWhereInput = {
    AND: [
      noticeScope(actor),
      f.search ? { OR: [{ title: { contains: f.search } }, { classes: { some: { classSection: { section: { equals: f.search.toUpperCase() } } } } }] } : {},
      f.status ? { workflowStatus: f.status === "APPROVED" ? { in: ["APPROVED", "SCHEDULED"] } : f.status } : {},
      f.category ? { category: f.category } : {},
      f.language ? { targetLanguages: { contains: f.language } } : {},
      f.channel ? { channels: { contains: f.channel } } : {},
      f.from || f.to ? { createdAt: { ...(f.from ? { gte: f.from } : {}), ...(f.to ? { lte: f.to } : {}) } } : {},
    ],
  };
  const page = Math.max(1, f.page ?? 1);
  const [total, notices] = await Promise.all([
    db.notice.count({ where }),
    db.notice.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { classes: { include: { classSection: true } }, creator: { select: { name: true } } },
    }),
  ]);
  const ids = notices.map((n) => n.id);
  const [recipientCounts, ackCounts] = await Promise.all([
    db.noticeRecipient.groupBy({ by: ["noticeId"], where: { noticeId: { in: ids }, deliveryStatus: { not: "SKIPPED" } }, _count: { guardianId: true } }),
    db.parentResponse.groupBy({ by: ["noticeId"], where: { noticeId: { in: ids }, responseType: "ACKNOWLEDGED" }, _count: { _all: true } }),
  ]);
  return {
    total,
    page,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    notices: notices.map((n) => ({
      id: n.id,
      title: n.title,
      category: n.category,
      workflowStatus: n.workflowStatus,
      priority: n.priority,
      targetLanguages: n.targetLanguages,
      createdAt: n.createdAt,
      dispatchedAt: n.dispatchedAt,
      creator: n.creator.name,
      classes: n.classes.map((c) => `${c.classSection.grade}-${c.classSection.section}`).join(", "),
      recipients: recipientCounts.find((r) => r.noticeId === n.id)?._count.guardianId ?? 0,
      acknowledged: ackCounts.find((r) => r.noticeId === n.id)?._count._all ?? 0,
    })),
  };
}

/** Teacher dashboard metrics, computed from the database for the notices this actor can see. */
export async function teacherStats(actor: Actor, now = new Date()) {
  const scope = noticeScope(actor);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [thisMonth, pending, recipients, delivered, acked, unanswered, followUps] = await Promise.all([
    db.notice.count({ where: { AND: [scope, { createdAt: { gte: monthStart } }] } }),
    db.notice.count({ where: { AND: [scope, { workflowStatus: "PENDING_APPROVAL" }] } }),
    db.noticeRecipient.findMany({ where: { notice: scope, deliveryStatus: { not: "SKIPPED" } }, distinct: ["guardianId"], select: { guardianId: true } }),
    db.noticeRecipient.count({ where: { notice: scope, deliveryStatus: "DELIVERED" } }),
    db.noticeRecipient.count({ where: { notice: scope, deliveryStatus: "DELIVERED", acknowledgedAt: { not: null } } }),
    db.parentResponse.count({ where: { notice: scope, responseType: "QUESTION", status: "OPEN" } }),
    db.followUpTask.count({ where: { notice: scope, status: "OPEN" } }),
  ]);
  return {
    thisMonth,
    pending,
    recipients: recipients.length,
    ackRate: percent(acked, delivered),
    unanswered,
    followUps,
  };
}
