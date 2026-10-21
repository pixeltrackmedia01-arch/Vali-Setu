import "server-only";
import { env } from "@/lib/env";
import { DemoAiProvider } from "./ai/demo";
import type { AiProvider, TranslationProvider } from "./ai/types";
import { DemoTranslationProvider } from "./translation/demo";
import { DemoSpeechProvider } from "./speech/demo";
import { EspeakSpeechProvider } from "./speech/espeak";
import type { SpeechProvider } from "./speech/types";
import { DemoMessagingProvider } from "./messaging/demo";
import { HttpMessagingProvider } from "./messaging/http";
import type { MessagingProvider } from "./messaging/types";

/**
 * The only place that decides which adapter runs. Business logic depends on
 * the interfaces, never on a vendor SDK.
 */
export async function getAiProvider(): Promise<AiProvider> {
  if (env().AI_PROVIDER === "anthropic") {
    const { AnthropicProvider } = await import("./ai/anthropic");
    return new AnthropicProvider();
  }
  return new DemoAiProvider();
}

export async function getTranslationProvider(): Promise<TranslationProvider> {
  if (env().TRANSLATION_PROVIDER === "ai" && env().AI_PROVIDER === "anthropic") {
    const { AnthropicProvider } = await import("./ai/anthropic");
    return new AnthropicProvider();
  }
  return new DemoTranslationProvider();
}

export function getSpeechProvider(): SpeechProvider {
  return env().SPEECH_PROVIDER === "espeak" ? new EspeakSpeechProvider(env().ESPEAK_BINARY) : new DemoSpeechProvider();
}

export function getMessagingProvider(): MessagingProvider {
  const e = env();
  if (e.APP_MODE === "live" && e.LIVE_DISPATCH_ENABLED && e.MESSAGING_PROVIDER !== "demo") {
    return new HttpMessagingProvider(e);
  }
  return new DemoMessagingProvider();
}

/** Labels shown in the UI so nobody mistakes simulated output for live output. */
export function providerStatus() {
  const e = env();
  return {
    mode: e.APP_MODE,
    ai: e.AI_PROVIDER === "anthropic" && e.ANTHROPIC_API_KEY ? "anthropic" : "demo",
    translation: e.TRANSLATION_PROVIDER === "ai" && e.AI_PROVIDER === "anthropic" ? "anthropic" : "demo",
    speech: e.SPEECH_PROVIDER,
    messaging: e.APP_MODE === "live" && e.LIVE_DISPATCH_ENABLED ? e.MESSAGING_PROVIDER : "demo",
    ocr: e.OCR_PROVIDER,
  };
}
