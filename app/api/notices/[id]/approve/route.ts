import { apiRoute } from "@/lib/api/handler";
import { approveNotice } from "@/services/notices";

export const POST = apiRoute({ roles: ["TEACHER", "HEAD_TEACHER"] }, async ({ user, params }) => {
  await approveNotice(user, params.id!);
  return { ok: true };
});
