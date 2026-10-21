import { apiRoute } from "@/lib/api/handler";
import { checkReadiness } from "@/lib/domain/workflow";
import { getNoticeForActor, readinessFor } from "@/services/notices";

export const GET = apiRoute({ roles: ["TEACHER", "HEAD_TEACHER", "SCHOOL_ADMIN"] }, async ({ user, params }) => {
  const notice = await getNoticeForActor(user, params.id!);
  const input = await readinessFor(notice);
  return { readiness: checkReadiness(input), deliverable: input.deliverable, skipped: input.skipped };
});
