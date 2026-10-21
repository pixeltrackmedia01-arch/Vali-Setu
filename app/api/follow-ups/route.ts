import { apiRoute } from "@/lib/api/handler";
import { followUpSchema } from "@/lib/validation/schemas";
import { createFollowUp } from "@/services/school";

export const POST = apiRoute({ roles: ["TEACHER", "HEAD_TEACHER", "SCHOOL_ADMIN"], body: followUpSchema }, async ({ user, body }) => {
  const task = await createFollowUp(user, body);
  return { id: task.id };
});
