import { apiRoute } from "@/lib/api/handler";
import { acknowledgeSchema } from "@/lib/validation/schemas";
import { acknowledgeMessage } from "@/services/parent";

export const POST = apiRoute({ roles: ["PARENT"], body: acknowledgeSchema }, async ({ user, params, body }) => {
  const { duplicate } = await acknowledgeMessage(user, params.id!, body.clientKey);
  return { ok: true, duplicate };
});
