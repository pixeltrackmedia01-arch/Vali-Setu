import "server-only";
import { db } from "@/lib/db";
import type { Actor } from "@/lib/permissions";

export interface ClassOptionData {
  id: string;
  label: string;
  families: { id: string; name: string }[];
}

/** Classes the actor may address: assigned classes for teachers, every class for head teachers. */
export async function classOptionsFor(actor: Actor): Promise<ClassOptionData[]> {
  if (!actor.schoolId) return [];
  const sections = await db.classSection.findMany({
    where: { schoolId: actor.schoolId, ...(actor.role === "TEACHER" ? { assignments: { some: { userId: actor.id } } } : {}) },
    orderBy: [{ grade: "asc" }, { section: "asc" }],
    include: {
      students: {
        where: { status: "ACTIVE" },
        orderBy: { rollNumber: "asc" },
        select: { displayName: true, guardians: { select: { guardian: { select: { id: true, displayName: true } } } } },
      },
    },
  });
  return sections.map((s) => ({
    id: s.id,
    label: `${s.grade}${s.section}`,
    families: s.students.flatMap((st) => st.guardians.map((g) => ({ id: g.guardian.id, name: `${g.guardian.displayName} (${st.displayName})` }))),
  }));
}
