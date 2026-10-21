import "server-only";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth/session";
import { isLanguage, type Language } from "@/lib/domain/constants";
import { createTranslator, LOCALE_COOKIE } from "./index";

/** Cookie wins (set by the language switcher), then the user's saved preference, then English. */
export async function getLocale(): Promise<Language> {
  const jar = await cookies();
  const fromCookie = jar.get(LOCALE_COOKIE)?.value;
  if (isLanguage(fromCookie)) return fromCookie;
  const user = await getCurrentUser();
  if (user && isLanguage(user.locale)) return user.locale;
  return "en";
}

export async function getT() {
  const locale = await getLocale();
  return { t: createTranslator(locale), locale };
}
