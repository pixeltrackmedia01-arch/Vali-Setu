import { extractCriticalDetails, toCriticalDetails } from "@/services/validation/extract";
import { findDemoSampleBySource } from "./demo-content";
import { ruleBasedSimplify } from "./simplify-rules";
import type { AiProvider } from "./types";

/** Deterministic stand-in used when no AI provider is configured. */
export class DemoAiProvider implements AiProvider {
  readonly id = "demo";

  async simplify({ text }: { text: string; language: string }) {
    const sample = findDemoSampleBySource(text);
    if (sample) {
      return { text: sample.simplified, provider: "demo", simulated: true, note: "curated-sample" };
    }
    return { text: ruleBasedSimplify(text), provider: "demo", simulated: true, note: "rule-based" };
  }

  async extractDetails({ text }: { text: string; language: string }) {
    return { ...toCriticalDetails(extractCriticalDetails(text)), provider: "deterministic" };
  }

  async suggestPlainLanguage({ text }: { text: string; language: string }) {
    const simplified = ruleBasedSimplify(text);
    return simplified === text ? [] : [simplified];
  }
}
