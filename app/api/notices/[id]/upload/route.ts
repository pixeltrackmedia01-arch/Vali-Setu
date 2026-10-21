import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api/handler";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { AppError, NotFoundError } from "@/services/errors";
import { getNoticeForActor } from "@/services/notices";
import { ocrStatus, storeUpload } from "@/services/documents/upload";
import { storagePath } from "@/services/speech/storage";

export const POST = apiRoute({ roles: ["TEACHER", "HEAD_TEACHER"] }, async ({ req, user, params }) => {
  const notice = await getNoticeForActor(user, params.id!);
  if (notice.workflowStatus === "DISPATCHED") throw new AppError("NOT_EDITABLE", "Dispatched notices cannot be changed.", 409);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new AppError("NO_FILE", "Choose a file to upload.", 400);
  const stored = await storeUpload(notice.id, file);
  await db.notice.update({ where: { id: notice.id }, data: { attachmentPath: stored.key, attachmentMime: stored.mime, attachmentName: stored.displayName } });
  await audit({ actorId: user.id, entityType: "Notice", entityId: notice.id, action: "notice.attachment_uploaded", metadata: { mime: stored.mime } });
  return { name: stored.displayName, mime: stored.mime, ocr: ocrStatus() };
});

/** Serve the attachment only to staff who can open the notice. */
export const GET = apiRoute({ roles: ["TEACHER", "HEAD_TEACHER", "SCHOOL_ADMIN"] }, async ({ user, params }) => {
  const notice = await getNoticeForActor(user, params.id!);
  if (!notice.attachmentPath || !notice.attachmentMime) throw new NotFoundError("Attachment");
  const data = await readFile(storagePath(notice.attachmentPath)).catch(() => null);
  if (!data) throw new NotFoundError("Attachment");
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "content-type": notice.attachmentMime,
      "content-disposition": `inline; filename="attachment"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
});
