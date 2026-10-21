import type { Tx } from "@/lib/db";
import { db } from "@/lib/db";

/** Record a sensitive action. Metadata must not contain message bodies or phone numbers. */
export async function audit(
  entry: { actorId: string | null; entityType: string; entityId: string; action: string; metadata?: Record<string, unknown> },
  client: Tx | typeof db = db,
): Promise<void> {
  await client.auditLog.create({
    data: {
      actorId: entry.actorId,
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      metadata: JSON.stringify(entry.metadata ?? {}),
    },
  });
}
