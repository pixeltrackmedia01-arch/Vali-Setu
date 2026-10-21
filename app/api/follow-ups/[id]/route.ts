import { apiRoute } from "@/lib/api/handler";
import { followUpUpdateSchema } from "@/lib/validation/schemas";
import { updateFollowUp } from "@/services/school";

export const PATCH = apiRoute({ roles: ["TEACHER", "HEAD_TEACHER", "SCHOOL_ADMIN"], body: followUpUpdateSchema }, async ({ user, params, body }) => {
  await updateFollowUp(user, params.id!, body.status);
  return { ok: true };
});
