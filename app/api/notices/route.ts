import { apiRoute, searchParams } from "@/lib/api/handler";
import { noticeInputSchema } from "@/lib/validation/schemas";
import { createNotice } from "@/services/notices";
import { listNotices } from "@/services/notices/queries";

const STAFF = ["TEACHER", "HEAD_TEACHER", "SCHOOL_ADMIN"] as const;

export const GET = apiRoute({ roles: [...STAFF] }, async ({ req, user }) => {
  const q = searchParams(req);
  return listNotices(user, { search: q.search, status: q.status, category: q.category, page: Number(q.page) || 1 });
});

export const POST = apiRoute({ roles: ["TEACHER", "HEAD_TEACHER"], body: noticeInputSchema }, async ({ user, body }) => {
  const notice = await createNotice(user, body);
  return { id: notice.id };
});
