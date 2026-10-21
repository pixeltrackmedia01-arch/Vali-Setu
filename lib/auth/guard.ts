import "server-only";
import { redirect } from "next/navigation";
import type { Role } from "@/lib/domain/constants";
import { ROLE_HOME } from "@/lib/permissions";
import { getCurrentUser, type SessionUser } from "./session";

/** For server components: send signed-out users to login and wrong roles to their own home. */
export async function requireUser(roles?: Role[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?expired=1");
  if (roles && !roles.includes(user.role)) redirect(`/forbidden?home=${encodeURIComponent(ROLE_HOME[user.role])}`);
  return user;
}
