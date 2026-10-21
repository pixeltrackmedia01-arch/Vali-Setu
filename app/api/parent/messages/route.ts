import { apiRoute } from "@/lib/api/handler";
import { listParentMessages } from "@/services/parent";

export const GET = apiRoute({ roles: ["PARENT"] }, async ({ user }) => ({ messages: await listParentMessages(user) }));
