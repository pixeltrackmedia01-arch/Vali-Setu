import { db } from "@/lib/db";
import { AppError } from "@/services/errors";

/**
 * Fixed-window limiter stored in the database so it holds across server
 * instances. Throws a 429 AppError when the window is exhausted.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<void> {
  const now = new Date();
  const bucket = await db.rateLimitBucket.findUnique({ where: { key } });
  if (!bucket || bucket.resetAt < now) {
    await db.rateLimitBucket.upsert({
      where: { key },
      create: { key, count: 1, resetAt: new Date(now.getTime() + windowSeconds * 1000) },
      update: { count: 1, resetAt: new Date(now.getTime() + windowSeconds * 1000) },
    });
    return;
  }
  if (bucket.count >= limit) {
    const wait = Math.ceil((bucket.resetAt.getTime() - now.getTime()) / 1000);
    throw new AppError("RATE_LIMITED", `Too many attempts. Please wait ${Math.ceil(wait / 60)} minute(s) and try again.`, 429);
  }
  await db.rateLimitBucket.update({ where: { key }, data: { count: { increment: 1 } } });
}
