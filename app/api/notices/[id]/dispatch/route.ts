import { apiRoute } from "@/lib/api/handler";
import { dispatchSchema } from "@/lib/validation/schemas";
import { dispatchNotice } from "@/services/notices/dispatch";

export const POST = apiRoute({ roles: ["TEACHER", "HEAD_TEACHER"], body: dispatchSchema }, async ({ user, params, body }) => {
  const summary = await dispatchNotice(user, params.id!, body.idempotencyKey, body.confirmLive);
  return { summary };
});
