import type { Channel } from "@/lib/domain/constants";

export interface SendInput {
  recipient: string;
  channel: Channel;
  language: string;
  text: string;
  audioUrl?: string;
  templateId?: string;
  /** Stable key per recipient+notice+channel+attempt so providers can de-duplicate. */
  idempotencyKey: string;
}

/**
 * "ACCEPTED" means the provider took the request. It is NOT delivery: delivery
 * and read receipts only arrive later through the status callback.
 */
export interface SendResult {
  providerMessageId?: string;
  status: "ACCEPTED" | "FAILED";
  errorCode?: string;
  /** Demo provider only: the simulated follow-up delivery outcome. */
  simulatedOutcome?: "DELIVERED" | "FAILED";
}

export interface MessagingProvider {
  readonly id: string;
  readonly simulated: boolean;
  sendMessage(input: SendInput): Promise<SendResult>;
}
