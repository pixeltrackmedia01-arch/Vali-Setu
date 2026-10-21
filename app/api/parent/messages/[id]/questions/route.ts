import { apiRoute } from "@/lib/api/handler";
import { rateLimit } from "@/lib/rate-limit";
import { questionSchema } from "@/lib/validation/schemas";
import { askQuestion } from "@/services/parent";

export const POST = apiRoute({ roles: ["PARENT"], body: questionSchema }, async ({ user, params, body }) => {
  await rateLimit(`question:${user.id}`, 20, 3600);
  const { response, duplicate } = await askQuestion(user, params.id!, body);
  return { id: response.id, duplicate };
});
