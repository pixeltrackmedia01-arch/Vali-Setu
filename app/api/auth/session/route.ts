import { apiRoute } from "@/lib/api/handler";

export const GET = apiRoute({}, async ({ user }) => ({
  user: { id: user.id, name: user.name, role: user.role, locale: user.locale },
}));
