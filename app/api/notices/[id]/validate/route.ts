import { apiRoute } from "@/lib/api/handler";
import { validateNotice } from "@/services/notices";

export const POST = apiRoute({ roles: ["TEACHER", "HEAD_TEACHER"] }, async ({ user, params }) => validateNotice(user, params.id!));
