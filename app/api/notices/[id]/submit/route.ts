import { apiRoute } from "@/lib/api/handler";
import { submitNotice } from "@/services/notices";

export const POST = apiRoute({ roles: ["TEACHER", "HEAD_TEACHER"] }, async ({ user, params }) => {
  await submitNotice(user, params.id!);
  return { ok: true };
});
