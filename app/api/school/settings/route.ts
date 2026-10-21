import { z } from "zod";
import { apiRoute } from "@/lib/api/handler";
import { LANGUAGES } from "@/lib/domain/constants";
import { updateSchoolSettings } from "@/services/school";

const schema = z.object({
  helpline: z.string().trim().max(40).optional(),
  supportedLanguages: z.array(z.enum(LANGUAGES)).min(1).optional(),
});

export const PATCH = apiRoute({ roles: ["SCHOOL_ADMIN"], body: schema }, async ({ user, body }) => {
  await updateSchoolSettings(user, body);
  return { ok: true };
});
