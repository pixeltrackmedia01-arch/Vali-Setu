import { audit } from "@/lib/audit";
import { dummyHash, verifyPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { AppError } from "@/services/errors";

/** Verify credentials. Returns the user id or throws a generic error that does not reveal which part was wrong. */
export async function authenticate(email: string, password: string, ip: string): Promise<{ id: string; role: string }> {
  await rateLimit(`login:${ip}:${email}`, 10, 15 * 60);
  const user = await db.user.findUnique({ where: { email } });
  const ok = await verifyPassword(password, user?.passwordHash ?? (await dummyHash()));
  if (!user || !ok || user.status !== "ACTIVE") {
    await audit({ actorId: null, entityType: "Auth", entityId: email.slice(0, 3) + "…", action: "auth.login_failed" });
    throw new AppError("INVALID_CREDENTIALS", "The email or password is not correct.", 401);
  }
  await audit({ actorId: user.id, entityType: "User", entityId: user.id, action: "auth.login" });
  return { id: user.id, role: user.role };
}
