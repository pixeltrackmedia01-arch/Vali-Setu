import { apiRoute } from "@/lib/api/handler";
import { questionReplySchema } from "@/lib/validation/schemas";
import { replyToQuestion } from "@/services/school";

export const PATCH = apiRoute({ roles: ["TEACHER", "HEAD_TEACHER", "SCHOOL_ADMIN"], body: questionReplySchema }, async ({ user, params, body }) => {
  await replyToQuestion(user, params.id!, body.reply, body.status);
  return { ok: true };
});
