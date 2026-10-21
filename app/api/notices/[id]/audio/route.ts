import { apiRoute } from "@/lib/api/handler";
import { audioSchema } from "@/lib/validation/schemas";
import { generateAudio } from "@/services/notices";

export const POST = apiRoute({ roles: ["TEACHER", "HEAD_TEACHER"], body: audioSchema }, async ({ user, params, body }) => {
  const audio = await generateAudio(user, params.id!, body.language, body.voice);
  return { audio: { id: audio.id, status: audio.status, provider: audio.provider, durationSeconds: audio.durationSeconds, note: audio.errorMessage } };
});
