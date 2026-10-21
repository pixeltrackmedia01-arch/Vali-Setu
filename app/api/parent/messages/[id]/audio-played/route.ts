import { apiRoute } from "@/lib/api/handler";
import { recordAudioPlay } from "@/services/parent";

export const POST = apiRoute({ roles: ["PARENT"] }, async ({ user, params }) => {
  await recordAudioPlay(user, params.id!);
  return { ok: true };
});
