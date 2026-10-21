import { apiRoute } from "@/lib/api/handler";
import { getParentMessage } from "@/services/parent";

export const GET = apiRoute({ roles: ["PARENT"] }, async ({ user, params }) => getParentMessage(user, params.id!));
