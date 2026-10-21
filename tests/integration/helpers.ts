import { db } from "@/lib/db";
import type { Role } from "@/lib/domain/constants";
import type { Actor } from "@/lib/permissions";

/** Build the same actor the session layer would produce for a seeded demo user. */
export async function actor(email: string): Promise<Actor & { name: string }> {
  const u = await db.user.findUniqueOrThrow({ where: { email: `${email}@valisetu.example` }, include: { guardian: { select: { id: true } } } });
  return {
    id: u.id,
    name: u.name,
    role: u.role as Role,
    schoolId: u.schoolId,
    cluster: u.cluster,
    block: u.block,
    district: u.district,
    canApprove: u.canApprove,
    guardianId: u.guardian?.id ?? null,
  };
}

export async function noticeByTitle(prefix: string) {
  return db.notice.findFirstOrThrow({ where: { title: { startsWith: prefix } } });
}
