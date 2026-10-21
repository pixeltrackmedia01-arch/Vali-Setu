export interface SpeechResult {
  /** Storage key relative to STORAGE_DIR, served only via /api/audio/[id]. Null when simulated. */
  audioReference: string | null;
  mimeType: string | null;
  durationSeconds?: number;
  provider: string;
  voice?: string;
  /** READY when real audio exists; SIMULATED when only a labelled placeholder is available. */
  status: "READY" | "SIMULATED";
  note?: string;
}

export interface SpeechProvider {
  readonly id: string;
  /** Voices the provider offers per BCP-47 locale (gu-IN, hi-IN, en-IN). */
  voices(locale: string): string[];
  synthesize(input: { text: string; language: string; voice?: string; outputKey: string }): Promise<SpeechResult>;
}
