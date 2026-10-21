import { apiRoute } from "@/lib/api/handler";
import { simplifyNotice } from "@/services/notices";

export const POST = apiRoute({ roles: ["TEACHER", "HEAD_TEACHER"] }, async ({ user, params }) => {
  const result = await simplifyNotice(user, params.id!);
  return { text: result.text, simulated: result.simulated, provider: result.provider, note: result.note };
});
