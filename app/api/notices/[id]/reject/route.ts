import { apiRoute } from "@/lib/api/handler";
import { rejectSchema } from "@/lib/validation/schemas";
import { rejectNotice } from "@/services/notices";

export const POST = apiRoute({ roles: ["TEACHER", "HEAD_TEACHER"], body: rejectSchema }, async ({ user, params, body }) => {
  await rejectNotice(user, params.id!, body.reason);
  return { ok: true };
});
