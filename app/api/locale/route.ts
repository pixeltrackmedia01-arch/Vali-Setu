import { cookies } from "next/headers";
import { apiRoute } from "@/lib/api/handler";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { LOCALE_COOKIE } from "@/lib/i18n";
import { localeSchema } from "@/lib/validation/schemas";

/** Works signed in or out; signed-in users also get the preference saved to their profile. */
export const POST = apiRoute({ roles: false, body: localeSchema }, async ({ body }) => {
  const jar = await cookies();
  jar.set(LOCALE_COOKIE, body.locale, { path: "/", sameSite: "lax", maxAge: 365 * 24 * 3600 });
  const user = await getCurrentUser();
  if (user) {
    await db.user.update({ where: { id: user.id }, data: { locale: body.locale } });
    if (user.role === "PARENT" && user.guardianId) {
      await db.parentGuardian.update({ where: { id: user.guardianId }, data: { preferredLanguage: body.locale } });
    }
  }
  return { ok: true };
});
