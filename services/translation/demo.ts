import { findDemoSampleByText } from "@/services/ai/demo-content";
import { ProviderUnavailableError } from "@/services/errors";
import { isLanguage } from "@/lib/domain/constants";
import type { TranslationProvider } from "@/services/ai/types";

/**
 * Returns hand-written translations for the curated sample notices. Anything
 * else is refused honestly instead of producing a fake translation.
 */
export class DemoTranslationProvider implements TranslationProvider {
  readonly id = "demo";

  async translate(input: { sourceText: string; sourceLanguage: string; targetLanguage: string }) {
    if (!isLanguage(input.targetLanguage)) {
      throw new ProviderUnavailableError("Translation", `Language "${input.targetLanguage}" is not supported.`);
    }
    if (input.targetLanguage === input.sourceLanguage) {
      return { translatedText: input.sourceText, provider: "demo", simulated: true };
    }
    const sample = findDemoSampleByText(input.sourceText);
    if (!sample) {
      throw new ProviderUnavailableError(
        "Translation",
        "Demo mode only has translations for the sample notices. Type the translation yourself, or configure a translation provider.",
      );
    }
    return { translatedText: sample.translations[input.targetLanguage], provider: "demo", simulated: true };
  }
}
