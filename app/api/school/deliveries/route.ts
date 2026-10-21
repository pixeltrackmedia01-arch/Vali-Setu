import { apiRoute, searchParams } from "@/lib/api/handler";
import { parseFilters } from "@/lib/api/filters";
import { schoolDeliveryTable } from "@/services/analytics";

export const GET = apiRoute({ roles: ["TEACHER", "HEAD_TEACHER", "SCHOOL_ADMIN"] }, async ({ req, user }) => {
  const q = searchParams(req);
  return schoolDeliveryTable(user, parseFilters(q), Number(q.page) || 1);
});
