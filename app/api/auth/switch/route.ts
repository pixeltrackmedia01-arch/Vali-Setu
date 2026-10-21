import { z } from "zod";
import { apiRoute } from "@/lib/api/handler";
import { createSession, destroySession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { demoSwitcherEnabled, DEMO_ACCOUNTS } from "@/lib/auth/demo";
import { ROLE_HOME } from "@/lib/permissions";
import type { Role } from "@/lib/domain/constants";
import { audit } from "@/lib/audit";
import { AppError } from "@/services/errors";

/**
 * Demo-only quick sign-in for presentations. Disabled when NODE_ENV=production.
 * It signs in as a seeded demo account; every request afterwards goes through
 * the normal authorization checks for that account.
 */
export const POST = apiRoute({ roles: false, body: z.object({ email: z.string().email() }) }, async ({ body }) => {
  if (!demoSwitcherEnabled()) throw new AppError("NOT_FOUND", "Not found.", 404);
  if (!DEMO_ACCOUNTS.some((a) => a.email === body.email)) throw new AppError("FORBIDDEN", "Not a demo account.", 403);
  const user = await db.user.findUnique({ where: { email: body.email } });
  if (!user) throw new AppError("NOT_FOUND", "Run the seed script first.", 404);
  await destroySession();
  await createSession(user.id);
  await audit({ actorId: user.id, entityType: "User", entityId: user.id, action: "auth.demo_switch" });
  return { redirectTo: ROLE_HOME[user.role as Role] };
});
