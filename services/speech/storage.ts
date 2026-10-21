import path from "node:path";
import { env } from "@/lib/env";

/** Recordings shipped with the code. They stay in the app bundle even when STORAGE_DIR points elsewhere. */
const BUNDLED_PREFIX = "demo-audio/";

/** Resolve a storage key safely inside STORAGE_DIR, rejecting path traversal. */
export function storagePath(key: string): string {
  const root = path.resolve(process.cwd(), key.startsWith(BUNDLED_PREFIX) ? "storage" : env().STORAGE_DIR);
  const full = path.resolve(root, key);
  if (!full.startsWith(root + path.sep)) throw new Error("Invalid storage key");
  return full;
}
