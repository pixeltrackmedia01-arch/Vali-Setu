import { apiRoute } from "@/lib/api/handler";
import { scheduleSchema } from "@/lib/validation/schemas";
import { scheduleNotice } from "@/services/notices";

export const POST = apiRoute({ roles: ["TEACHER", "HEAD_TEACHER"], body: scheduleSchema }, async ({ user, params, body }) => {
  await scheduleNotice(user, params.id!, new Date(body.scheduledAt));
  return { ok: true };
});
