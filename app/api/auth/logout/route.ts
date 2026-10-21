import { apiRoute } from "@/lib/api/handler";
import { destroySession } from "@/lib/auth/session";

export const POST = apiRoute({}, async () => {
  await destroySession();
  return { redirectTo: "/login" };
});
