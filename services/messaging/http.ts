import type { Env } from "@/lib/env";
import { ProviderUnavailableError } from "@/services/errors";
import type { MessagingProvider, SendInput, SendResult } from "./types";

/**
 * Integration point for real WhatsApp Business, SMS (DLT-registered) and voice/IVR
 * gateways. Each gateway has its own request format; adapt `buildRequest` to the
 * chosen vendor. NOT TESTED against any live provider in this prototype.
 *
 * Before enabling: approved WhatsApp templates and recipient opt-in, DLT entity and
 * template registration for SMS (TRAI), caller-ID rules for voice, and consent
 * records for every recipient.
 */
export class HttpMessagingProvider implements MessagingProvider {
  readonly id: string;
  readonly simulated = false;

  constructor(private env: Env) {
    this.id = env.MESSAGING_PROVIDER;
  }

  private config(channel: SendInput["channel"]) {
    const e = this.env;
    if (channel === "whatsapp" && e.WHATSAPP_API_URL && e.WHATSAPP_ACCESS_TOKEN) {
      return { url: e.WHATSAPP_API_URL, token: e.WHATSAPP_ACCESS_TOKEN };
    }
    if (channel === "sms" && e.SMS_API_URL && e.SMS_API_KEY && e.SMS_SENDER_ID && e.SMS_DLT_ENTITY_ID) {
      return { url: e.SMS_API_URL, token: e.SMS_API_KEY };
    }
    if (channel === "voice" && e.VOICE_API_URL && e.VOICE_API_KEY) {
      return { url: e.VOICE_API_URL, token: e.VOICE_API_KEY };
    }
    throw new ProviderUnavailableError("Messaging", `The ${channel} channel is not configured.`);
  }

  async sendMessage(input: SendInput): Promise<SendResult> {
    const { url, token } = this.config(input.channel);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
          "idempotency-key": input.idempotencyKey,
        },
        body: JSON.stringify({
          to: input.recipient,
          channel: input.channel,
          language: input.language,
          text: input.text,
          audioUrl: input.audioUrl,
          templateId: input.templateId,
          senderId: input.channel === "sms" ? this.env.SMS_SENDER_ID : undefined,
          dltEntityId: input.channel === "sms" ? this.env.SMS_DLT_ENTITY_ID : undefined,
        }),
      });
      if (!res.ok) return { status: "FAILED", errorCode: `HTTP_${res.status}` };
      const body = (await res.json().catch(() => ({}))) as { id?: string; messageId?: string };
      return { status: "ACCEPTED", providerMessageId: body.id ?? body.messageId };
    } catch {
      return { status: "FAILED", errorCode: "NETWORK" };
    } finally {
      clearTimeout(timer);
    }
  }
}
