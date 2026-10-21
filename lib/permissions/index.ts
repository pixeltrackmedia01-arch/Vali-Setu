import type { Prisma } from "@prisma/client";
import type { Role } from "@/lib/domain/constants";

/**
 * Authorization rules. Every server operation calls these with the user from
 * the session; nothing here trusts ids sent by the browser.
 */
export interface Actor {
  id: string;
  role: Role;
  schoolId: string | null;
  cluster: string | null;
  block: string | null;
  district: string | null;
  canApprove: boolean;
  guardianId?: string | null;
}

export type Permission =
  | "notice.create"
  | "notice.view"
  | "notice.approve"
  | "notice.dispatch"
  | "notice.override"
  | "responses.manage"
  | "school.manage"
  | "reports.school"
  | "reports.region"
  | "reports.district"
  | "export.contacts"
  | "parent.portal";

const STAFF: Role[] = ["TEACHER", "HEAD_TEACHER", "SCHOOL_ADMIN"];

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  TEACHER: ["notice.create", "notice.view", "notice.dispatch", "responses.manage"],
  HEAD_TEACHER: [
    "notice.create",
    "notice.view",
    "notice.approve",
    "notice.dispatch",
    "notice.override",
    "responses.manage",
    "reports.school",
    "export.contacts",
  ],
  SCHOOL_ADMIN: ["notice.view", "responses.manage", "school.manage", "reports.school", "export.contacts"],
  CRC_OFFICER: ["reports.region"],
  BRC_OFFICER: ["reports.region"],
  DISTRICT_OFFICIAL: ["reports.region", "reports.district"],
  PARENT: ["parent.portal"],
};

export function can(actor: Actor, permission: Permission): boolean {
  if (permission === "notice.approve" && actor.role === "TEACHER") return actor.canApprove;
  if (permission === "notice.override" && actor.role === "TEACHER") return actor.canApprove;
  return ROLE_PERMISSIONS[actor.role].includes(permission);
}

export function isSchoolStaff(actor: Actor): boolean {
  return STAFF.includes(actor.role);
}

/** Schools an actor may see, as a Prisma filter. Parents get no school-level scope. */
export function schoolScope(actor: Actor): Prisma.SchoolWhereInput {
  switch (actor.role) {
    case "TEACHER":
    case "HEAD_TEACHER":
    case "SCHOOL_ADMIN":
      return { id: actor.schoolId ?? "__none__" };
    case "CRC_OFFICER":
      return { district: actor.district ?? "__none__", block: actor.block ?? "__none__", cluster: actor.cluster ?? "__none__" };
    case "BRC_OFFICER":
      return { district: actor.district ?? "__none__", block: actor.block ?? "__none__" };
    case "DISTRICT_OFFICIAL":
      return { district: actor.district ?? "__none__" };
    case "PARENT":
      return { id: "__none__" };
  }
}

export function schoolInScope(
  actor: Actor,
  school: { id: string; district: string; block: string; cluster: string },
): boolean {
  switch (actor.role) {
    case "TEACHER":
    case "HEAD_TEACHER":
    case "SCHOOL_ADMIN":
      return actor.schoolId === school.id;
    case "CRC_OFFICER":
      return school.district === actor.district && school.block === actor.block && school.cluster === actor.cluster;
    case "BRC_OFFICER":
      return school.district === actor.district && school.block === actor.block;
    case "DISTRICT_OFFICIAL":
      return school.district === actor.district;
    case "PARENT":
      return false;
  }
}

/**
 * Notices a staff member may open. Teachers see notices they wrote or that
 * target a class they are assigned to; head teachers and admins see their
 * whole school. Regional roles only see aggregates, never notice workspaces.
 */
export function noticeScope(actor: Actor): Prisma.NoticeWhereInput {
  if (!isSchoolStaff(actor) || !actor.schoolId) return { id: "__none__" };
  if (actor.role === "TEACHER") {
    return {
      schoolId: actor.schoolId,
      OR: [
        { creatorId: actor.id },
        { classes: { some: { classSection: { assignments: { some: { userId: actor.id } } } } } },
      ],
    };
  }
  return { schoolId: actor.schoolId };
}

/** Regional and district users may download contact details only with this permission. */
export function canExportContacts(actor: Actor): boolean {
  return can(actor, "export.contacts");
}

export const ROLE_HOME: Record<Role, string> = {
  TEACHER: "/teacher/dashboard",
  HEAD_TEACHER: "/school/dashboard",
  SCHOOL_ADMIN: "/school/dashboard",
  CRC_OFFICER: "/crc-brc/dashboard",
  BRC_OFFICER: "/crc-brc/dashboard",
  DISTRICT_OFFICIAL: "/district/dashboard",
  PARENT: "/parent/messages",
};

/** Which route prefixes each role may open. Checked server-side in each layout. */
export const ROUTE_ROLES: Record<string, Role[]> = {
  "/teacher": ["TEACHER", "HEAD_TEACHER"],
  "/school": ["HEAD_TEACHER", "SCHOOL_ADMIN"],
  "/notices": ["TEACHER", "HEAD_TEACHER", "SCHOOL_ADMIN"],
  "/crc-brc": ["CRC_OFFICER", "BRC_OFFICER"],
  "/district": ["DISTRICT_OFFICIAL"],
  "/parent": ["PARENT"],
};
