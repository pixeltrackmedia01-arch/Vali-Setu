import { z } from "zod";
import { apiRoute } from "@/lib/api/handler";
import { resolveContactCorrection } from "@/services/school";

const schema = z.object({ phone: z.string().trim().regex(/^\+?[0-9 ]{10,16}$/, "Enter a valid phone number").nullable() });

/** Staff confirm a parent's contact correction request after checking it. */
export const PATCH = apiRoute({ roles: ["SCHOOL_ADMIN"], body: schema }, async ({ user, params, body }) => {
  await resolveContactCorrection(user, params.id!, body.phone);
  return { ok: true };
});
