import { createHash } from "node:crypto";
import type { MessagingProvider, SendInput, SendResult } from "./types";

/**
 * Never contacts anyone. Outcomes are derived from a hash of the idempotency
 * key, so the same dispatch always produces the same simulated result.
 */
export class DemoMessagingProvider implements MessagingProvider {
  readonly id = "demo";
  readonly simulated = true;

  async sendMessage(input: SendInput): Promise<SendResult> {
    const h = createHash("sha256").update(input.idempotencyKey).digest();
    // The part before ":" identifies the recipient, so a "bad number" fails on every retry.
    const recipientHash = createHash("sha256").update(input.idempotencyKey.split(":")[0]!).digest();
    const roll = h[0]! / 255;
    const unreachable = recipientHash[0]! / 255 < (input.channel === "voice" ? 0.12 : 0.05);
    const providerMessageId = `demo-${h.toString("hex").slice(0, 16)}`;
    if (!input.recipient) return { status: "FAILED", errorCode: "NO_CONTACT", providerMessageId };
    // Transient failures are retried; unreachable numbers keep failing.
    const failRate = input.channel === "voice" ? 0.2 : 0.08;
    if (unreachable || roll < failRate) {
      return { status: "ACCEPTED", providerMessageId, simulatedOutcome: "FAILED", errorCode: input.channel === "voice" ? "NO_ANSWER" : "UNDELIVERABLE" };
    }
    return { status: "ACCEPTED", providerMessageId, simulatedOutcome: "DELIVERED" };
  }
}
