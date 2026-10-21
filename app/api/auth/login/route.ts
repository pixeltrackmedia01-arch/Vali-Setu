import { apiRoute } from "@/lib/api/handler";
import { createSession } from "@/lib/auth/session";
import { ROLE_HOME } from "@/lib/permissions";
import type { Role } from "@/lib/domain/constants";
import { loginSchema } from "@/lib/validation/schemas";
import { authenticate } from "@/services/auth";

export const POST = apiRoute({ roles: false, body: loginSchema }, async ({ req, body }) => {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const user = await authenticate(body.email, body.password, ip);
  await createSession(user.id);
  return { redirectTo: ROLE_HOME[user.role as Role] };
});
