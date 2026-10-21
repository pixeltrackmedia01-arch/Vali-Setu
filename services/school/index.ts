import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { LANGUAGES } from "@/lib/domain/constants";
import { can, isSchoolStaff, noticeScope, type Actor } from "@/lib/permissions";
import { ForbiddenError, NotFoundError } from "@/services/errors";

function requireStaff(actor: Actor) {
  if (!isSchoolStaff(actor) || !actor.schoolId) throw new ForbiddenError();
  return actor.schoolId;
}

/** Questions from parents on notices the actor can see. */
export async function listQuestions(actor: Actor, status?: string) {
  requireStaff(actor);
  return db.parentResponse.findMany({
    where: { responseType: "QUESTION", notice: noticeScope(actor), ...(status ? { status } : {}) },
    orderBy: [{ status: "desc" }, { createdAt: "desc" }],
    take: 100,
    include: {
      notice: { select: { id: true, title: true } },
      guardian: { select: { id: true, displayName: true, preferredLanguage: true } },
    },
  });
}

export async function replyToQuestion(actor: Actor, responseId: string, reply: string, status: "ANSWERED" | "CLOSED") {
  if (!can(actor, "responses.manage")) throw new ForbiddenError();
  const response = await db.parentResponse.findFirst({ where: { id: responseId, responseType: "QUESTION", notice: noticeScope(actor) } });
  if (!response) throw new NotFoundError("Question");
  await db.parentResponse.update({ where: { id: responseId }, data: { staffReply: reply, status } });
  await audit({ actorId: actor.id, entityType: "ParentResponse", entityId: responseId, action: "question.replied", metadata: { status } });
}

export async function createFollowUp(actor: Actor, input: { guardianId?: string; noticeId?: string; reason: string; dueAt?: string }) {
  const schoolId = requireStaff(actor);
  // Both ids must belong to this school; ids from the browser are never trusted on their own.
  if (input.guardianId) {
    const ok = await db.parentGuardian.findFirst({ where: { id: input.guardianId, students: { some: { student: { schoolId } } } } });
    if (!ok) throw new NotFoundError("Family");
  }
  if (input.noticeId) {
    const ok = await db.notice.findFirst({ where: { AND: [{ id: input.noticeId }, noticeScope(actor)] } });
    if (!ok) throw new NotFoundError("Notice");
  }
  const task = await db.followUpTask.create({
    data: {
      schoolId,
      guardianId: input.guardianId,
      noticeId: input.noticeId,
      assignedToId: actor.id,
      reason: input.reason,
      dueAt: input.dueAt ? new Date(input.dueAt) : new Date(Date.now() + 2 * 24 * 3600 * 1000),
    },
  });
  await audit({ actorId: actor.id, entityType: "FollowUpTask", entityId: task.id, action: "followup.created", metadata: { noticeId: input.noticeId } });
  return task;
}

export async function updateFollowUp(actor: Actor, id: string, status: "OPEN" | "DONE") {
  const schoolId = requireStaff(actor);
  const task = await db.followUpTask.findFirst({ where: { id, schoolId } });
  if (!task) throw new NotFoundError("Task");
  await db.followUpTask.update({ where: { id }, data: { status, completedAt: status === "DONE" ? new Date() : null } });
  await audit({ actorId: actor.id, entityType: "FollowUpTask", entityId: id, action: `followup.${status.toLowerCase()}` });
}

export async function listFamilies(actor: Actor, f: { search?: string; classSectionId?: string; language?: string; page?: number }) {
  const schoolId = requireStaff(actor);
  const pageSize = 20;
  const page = Math.max(1, f.page ?? 1);
  const where = {
    students: {
      some: {
        authStatus: "AUTHORIZED",
        student: { schoolId, ...(f.classSectionId ? { classSectionId: f.classSectionId } : {}) },
      },
    },
    ...(f.language ? { preferredLanguage: f.language } : {}),
    ...(f.search ? { displayName: { contains: f.search } } : {}),
  };
  const [total, families] = await Promise.all([
    db.parentGuardian.count({ where }),
    db.parentGuardian.findMany({
      where,
      orderBy: { displayName: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        students: { include: { student: { include: { classSection: true } } } },
        followUps: { where: { status: "OPEN" }, select: { id: true } },
      },
    }),
  ]);
  return { total, page, pages: Math.max(1, Math.ceil(total / pageSize)), families };
}

export async function getFamily(actor: Actor, guardianId: string) {
  const schoolId = requireStaff(actor);
  const family = await db.parentGuardian.findFirst({
    where: { id: guardianId, students: { some: { student: { schoolId } } } },
    include: {
      students: { include: { student: { include: { classSection: true } } } },
      recipients: { where: { notice: { schoolId } }, include: { notice: { select: { id: true, title: true, dispatchedAt: true } } }, orderBy: { lastAttemptAt: "desc" }, take: 20 },
      responses: { where: { schoolId }, include: { notice: { select: { title: true } } }, orderBy: { createdAt: "desc" } },
      followUps: { where: { schoolId }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!family) throw new NotFoundError("Family");
  return family;
}

export async function updateSchoolSettings(actor: Actor, input: { helpline?: string; supportedLanguages?: string[] }) {
  if (!can(actor, "school.manage") || !actor.schoolId) throw new ForbiddenError();
  const langs = input.supportedLanguages?.filter((l) => (LANGUAGES as readonly string[]).includes(l));
  await db.school.update({
    where: { id: actor.schoolId },
    data: { helpline: input.helpline, supportedLanguages: langs?.length ? langs.join(",") : undefined },
  });
  await audit({ actorId: actor.id, entityType: "School", entityId: actor.schoolId, action: "school.settings_updated" });
}

/** Staff can mark a family's contact as corrected after verifying it. */
export async function resolveContactCorrection(actor: Actor, guardianId: string, phone: string | null) {
  if (!can(actor, "school.manage")) throw new ForbiddenError();
  await getFamily(actor, guardianId);
  await db.parentGuardian.update({ where: { id: guardianId }, data: { phone, phoneVerified: Boolean(phone), contactCorrectionNote: null } });
  await audit({ actorId: actor.id, entityType: "ParentGuardian", entityId: guardianId, action: "family.contact_corrected" });
}
