import path from "node:path";
import { env } from "@/lib/env";

/** Resolve a storage key safely inside STORAGE_DIR, rejecting path traversal. */
export function storagePath(key: string): string {
  const root = path.resolve(process.cwd(), env().STORAGE_DIR);
  const full = path.resolve(root, key);
  if (!full.startsWith(root + path.sep)) throw new Error("Invalid storage key");
  return full;
}
