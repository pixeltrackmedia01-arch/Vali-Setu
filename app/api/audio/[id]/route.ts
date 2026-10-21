import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api/handler";
import { db } from "@/lib/db";
import { noticeScope } from "@/lib/permissions";
import { NotFoundError } from "@/services/errors";
import { storagePath } from "@/services/speech/storage";

/**
 * Audio is never public. Staff need access to the notice; parents need to be
 * a recipient of a dispatched notice.
 */
export const GET = apiRoute({}, async ({ user, params }) => {
  const audio = await db.noticeAudio.findUnique({ where: { id: params.id! } });
  if (!audio || !audio.audioReference || audio.status !== "READY") throw new NotFoundError("Audio");
  const allowed =
    user.role === "PARENT"
      ? Boolean(await db.noticeRecipient.findFirst({ where: { noticeId: audio.noticeId, guardianId: user.guardianId ?? "__none__", notice: { workflowStatus: "DISPATCHED" } } }))
      : Boolean(await db.notice.findFirst({ where: { AND: [{ id: audio.noticeId }, noticeScope(user)] }, select: { id: true } }));
  if (!allowed) throw new NotFoundError("Audio");
  const data = await readFile(storagePath(audio.audioReference)).catch(() => null);
  if (!data) throw new NotFoundError("Audio");
  return new NextResponse(new Uint8Array(data), {
    headers: { "content-type": audio.mimeType ?? "audio/mpeg", "cache-control": "private, max-age=3600", "content-length": String(data.length) },
  });
});
