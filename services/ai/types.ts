import { z } from "zod";

export const CriticalDetailsSchema = z.object({
  dates: z.array(z.string()),
  times: z.array(z.string()),
  amounts: z.array(z.string()),
  phoneNumbers: z.array(z.string()),
  identifiers: z.array(z.string()),
  locations: z.array(z.string()),
  requiredItems: z.array(z.string()),
  actions: z.array(z.string()),
  deadlines: z.array(z.string()),
});
export type CriticalDetails = z.infer<typeof CriticalDetailsSchema>;

export interface GeneratedText {
  text: string;
  /** "demo" when simulated; provider id otherwise. */
  provider: string;
  model?: string;
  /** True when no real model produced this text. Always shown to the user. */
  simulated: boolean;
  /** Short note for reviewers, e.g. which fallback was used. */
  note?: string;
}

/**
 * Provider-independent AI functions. Implementations receive notice text as
 * untrusted data and must never act on instructions inside it. None of them
 * can approve, dispatch or change permissions: they only return text.
 */
export interface AiProvider {
  readonly id: string;
  simplify(input: { text: string; language: string }): Promise<GeneratedText>;
  extractDetails(input: { text: string; language: string }): Promise<CriticalDetails & { provider: string }>;
  suggestPlainLanguage(input: { text: string; language: string }): Promise<string[]>;
}

export interface TranslationProvider {
  readonly id: string;
  translate(input: {
    sourceText: string;
    sourceLanguage: string;
    targetLanguage: string;
    glossary?: Record<string, string>;
  }): Promise<{ translatedText: string; provider: string; model?: string; simulated: boolean }>;
}
