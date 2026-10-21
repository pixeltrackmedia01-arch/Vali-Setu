import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

const payloadSchema = z.object({
  providerMessageId: z.string().min(1).max(200),
  status: z.enum(["SENT", "DELIVERED", "READ", "FAILED"]),
  errorCode: z.string().max(100).optional(),
  timestamp: z.string().datetime({ offset: true }).optional(),
});

/**
 * Delivery-status callback for live providers. The body must be signed with
 * HMAC-SHA256 using WEBHOOK_SECRET (header x-vs-signature: sha256=<hex>).
 * Adapt the payload mapping to the chosen provider's callback format.
 */
export async function POST(req: NextRequest) {
  const secret = env().WEBHOOK_SECRET;
  if (!secret || env().APP_MODE !== "live") return NextResponse.json({ error: "Not enabled" }, { status: 404 });
  const raw = await req.text();
  const expected = `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`;
  const given = req.headers.get("x-vs-signature") ?? "";
  if (given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
    return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  }
  const parsed = payloadSchema.safeParse(JSON.parse(raw || "{}"));
  if (!parsed.success) return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  const { providerMessageId, status, errorCode } = parsed.data;
  const at = parsed.data.timestamp ? new Date(parsed.data.timestamp) : new Date();

  const attempt = await db.messageDeliveryAttempt.findFirst({ where: { providerMessageId } });
  if (!attempt) return NextResponse.json({ ok: true, ignored: true });
  await db.messageDeliveryAttempt.update({ where: { id: attempt.id }, data: { status: status === "READ" ? "DELIVERED" : status, errorCode } });
  // "READ" from a provider is a provider read receipt, recorded as readAt only.
  await db.noticeRecipient.update({
    where: { id: attempt.recipientId },
    data:
      status === "DELIVERED"
        ? { deliveryStatus: "DELIVERED", deliveredAt: at }
        : status === "READ"
          ? { readAt: at }
          : status === "FAILED"
            ? { deliveryStatus: "FAILED", failureReason: errorCode ?? "FAILED" }
            : { deliveryStatus: "SENT", sentAt: at },
  });
  await audit({ actorId: null, entityType: "NoticeRecipient", entityId: attempt.recipientId, action: `delivery.callback_${status.toLowerCase()}` });
  return NextResponse.json({ ok: true });
}
