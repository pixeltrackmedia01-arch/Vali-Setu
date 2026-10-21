import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";
import { AppError } from "@/services/errors";
import { storagePath } from "@/services/speech/storage";

const SIGNATURES: { mime: string; ext: string; test: (b: Buffer) => boolean }[] = [
  { mime: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", ext: "png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: "image/webp", ext: "webp", test: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
  { mime: "application/pdf", ext: "pdf", test: (b) => b.subarray(0, 5).toString("ascii") === "%PDF-" },
];

/** Detect the real file type from its first bytes; the filename and browser MIME type are not trusted. */
export function sniffMime(bytes: Buffer): { mime: string; ext: string } | null {
  const hit = SIGNATURES.find((s) => s.test(bytes));
  return hit ? { mime: hit.mime, ext: hit.ext } : null;
}

export async function storeUpload(noticeId: string, file: File) {
  const max = env().UPLOAD_MAX_BYTES;
  if (file.size === 0) throw new AppError("EMPTY_FILE", "The file is empty.", 400);
  if (file.size > max) throw new AppError("FILE_TOO_LARGE", `The file is larger than ${Math.round(max / 1024 / 1024)} MB.`, 413);
  const bytes = Buffer.from(await file.arrayBuffer());
  const type = sniffMime(bytes);
  if (!type) throw new AppError("INVALID_FILE_TYPE", "Only JPG, PNG, WebP images or PDF files are accepted.", 415);
  const key = `uploads/${noticeId}-${randomBytes(8).toString("hex")}.${type.ext}`;
  const full = storagePath(key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, bytes, { mode: 0o600 });
  // Keep only a safe display name.
  const displayName = file.name.replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 80) || `circular.${type.ext}`;
  return { key, mime: type.mime, displayName };
}

/** No OCR adapter ships with the prototype; callers must say so honestly. */
export function ocrStatus(): { status: "unavailable" } {
  return { status: "unavailable" };
}
