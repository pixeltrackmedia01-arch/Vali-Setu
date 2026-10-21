import { cookies } from "next/headers";
import { apiRoute } from "@/lib/api/handler";
import { LOCALE_COOKIE } from "@/lib/i18n";
import { parentPrefsSchema } from "@/lib/validation/schemas";
import { updateParentPreferences } from "@/services/parent";

export const PATCH = apiRoute({ roles: ["PARENT"], body: parentPrefsSchema }, async ({ user, body }) => {
  await updateParentPreferences(user, body);
  if (body.preferredLanguage) (await cookies()).set(LOCALE_COOKIE, body.preferredLanguage, { path: "/", sameSite: "lax", maxAge: 365 * 24 * 3600 });
  return { ok: true };
});
