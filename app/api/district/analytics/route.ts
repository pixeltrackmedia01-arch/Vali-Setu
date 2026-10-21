import { apiRoute, searchParams } from "@/lib/api/handler";
import { parseFilters } from "@/lib/api/filters";
import { regionAnalytics } from "@/services/analytics";

export const GET = apiRoute({ roles: ["DISTRICT_OFFICIAL"] }, async ({ req, user }) => regionAnalytics(user, parseFilters(searchParams(req))));
