import { apiRoute } from "@/lib/api/handler";
import { resolveValidationSchema } from "@/lib/validation/schemas";
import { resolveValidation } from "@/services/notices";

export const PATCH = apiRoute({ roles: ["TEACHER", "HEAD_TEACHER"], body: resolveValidationSchema }, async ({ user, params, body }) => {
  await resolveValidation(user, params.id!, body.validationId, body.resolution, body.note);
  return { ok: true };
});
