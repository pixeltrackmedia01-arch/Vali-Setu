import { apiRoute } from "@/lib/api/handler";
import { noticePatchSchema } from "@/lib/validation/schemas";
import { getNoticeForActor, updateNotice } from "@/services/notices";

export const GET = apiRoute({ roles: ["TEACHER", "HEAD_TEACHER", "SCHOOL_ADMIN"] }, async ({ user, params }) => {
  const notice = await getNoticeForActor(user, params.id!);
  return { notice };
});

export const PATCH = apiRoute({ roles: ["TEACHER", "HEAD_TEACHER"], body: noticePatchSchema }, async ({ user, params, body }) => {
  const notice = await updateNotice(user, params.id!, body);
  return { id: notice.id, version: notice.version, workflowStatus: notice.workflowStatus };
});
