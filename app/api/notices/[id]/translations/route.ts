import { apiRoute } from "@/lib/api/handler";
import { translationActionSchema, translationEditSchema } from "@/lib/validation/schemas";
import { editTranslation, generateTranslation, rejectTranslation, resetTranslation } from "@/services/notices";
import { AppError } from "@/services/errors";

/** generate | reset | reject */
export const POST = apiRoute({ roles: ["TEACHER", "HEAD_TEACHER"], body: translationActionSchema }, async ({ user, params, body }) => {
  if (body.action === "generate") return { translation: await generateTranslation(user, params.id!, body.language) };
  if (body.action === "reset") return { translation: await resetTranslation(user, params.id!, body.language) };
  if (!body.reason) throw new AppError("REASON_REQUIRED", "Give a reason for rejecting the translation.", 400);
  await rejectTranslation(user, params.id!, body.language, body.reason);
  return { ok: true };
});

/** Manual edit. Never overwrites the source notice. */
export const PUT = apiRoute({ roles: ["TEACHER", "HEAD_TEACHER"], body: translationEditSchema }, async ({ user, params, body }) => {
  return { translation: await editTranslation(user, params.id!, body.language, body.text) };
});
