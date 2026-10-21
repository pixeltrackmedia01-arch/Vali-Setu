import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { storagePath } from "./storage";
import type { SpeechProvider, SpeechResult } from "./types";

interface ManifestEntry {
  file: string;
  language: string;
  durationSeconds: number;
  generator: string;
}

let manifest: Record<string, ManifestEntry> | undefined;

function loadManifest(): Record<string, ManifestEntry> {
  if (manifest) return manifest;
  try {
    manifest = JSON.parse(readFileSync(storagePath("demo-audio/manifest.json"), "utf8")) as Record<string, ManifestEntry>;
  } catch {
    manifest = {};
  }
  return manifest;
}

export function textHash(text: string): string {
  return createHash("sha256").update(text.replace(/\s+/g, " ").trim()).digest("hex").slice(0, 24);
}

/**
 * Demo speech: plays pre-generated sample recordings for the curated sample
 * texts (generated offline with eSpeak NG, see scripts/generate-demo-audio.ts).
 * Any other text gets an honest "simulated" result with no audio.
 */
export class DemoSpeechProvider implements SpeechProvider {
  readonly id = "demo";

  voices(): string[] {
    return ["sample"];
  }

  async synthesize({ text, language }: { text: string; language: string; outputKey: string }): Promise<SpeechResult> {
    const entry = loadManifest()[textHash(text)];
    if (entry && entry.language === language && existsSync(storagePath(`demo-audio/${entry.file}`))) {
      return {
        audioReference: `demo-audio/${entry.file}`,
        mimeType: "audio/mpeg",
        durationSeconds: entry.durationSeconds,
        provider: "demo-sample",
        voice: entry.generator,
        status: "READY",
        note: "Pre-generated sample recording (eSpeak NG, open-source synthetic voice).",
      };
    }
    return {
      audioReference: null,
      mimeType: null,
      provider: "demo",
      status: "SIMULATED",
      note: "No speech provider is configured. This is a simulated player; no voice audio exists for this text.",
    };
  }
}
