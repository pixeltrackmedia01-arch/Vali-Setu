import { apiRoute, searchParams } from "@/lib/api/handler";
import { parseFilters } from "@/lib/api/filters";
import { schoolAnalytics } from "@/services/analytics";

export const GET = apiRoute({ roles: ["HEAD_TEACHER", "SCHOOL_ADMIN"] }, async ({ req, user }) => schoolAnalytics(user, parseFilters(searchParams(req))));
