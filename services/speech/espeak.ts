import { execFile } from "node:child_process";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { ProviderUnavailableError } from "@/services/errors";
import { storagePath } from "./storage";
import type { SpeechProvider, SpeechResult } from "./types";

const run = promisify(execFile);

const VOICE_BY_LANGUAGE: Record<string, string> = { gu: "gu", hi: "hi", en: "en-us" };

/**
 * Offline synthesis with eSpeak NG (GPL, free). Gujarati and Hindi are
 * intelligible but robotic; use it for demos and testing, not for parents.
 * Text is passed on stdin, never interpolated into a shell command.
 */
export class EspeakSpeechProvider implements SpeechProvider {
  readonly id = "espeak";
  constructor(private binary: string) {}

  voices(locale: string): string[] {
    const lang = locale.slice(0, 2);
    return VOICE_BY_LANGUAGE[lang] ? [VOICE_BY_LANGUAGE[lang]] : [];
  }

  async synthesize({ text, language, outputKey }: { text: string; language: string; voice?: string; outputKey: string }): Promise<SpeechResult> {
    const voice = VOICE_BY_LANGUAGE[language];
    if (!voice) throw new ProviderUnavailableError("Speech", `No eSpeak voice for "${language}".`);
    const wavKey = `${outputKey}.wav`;
    const wavPath = storagePath(wavKey);
    await mkdir(path.dirname(wavPath), { recursive: true });
    try {
      await runWithStdin(this.binary, ["-v", voice, "-s", "140", "--stdin", "-w", wavPath], text);
    } catch {
      throw new ProviderUnavailableError("Speech", "eSpeak NG is not installed or failed. Install espeak-ng or switch SPEECH_PROVIDER to demo.");
    }
    let key = wavKey;
    let mime = "audio/wav";
    try {
      const mp3Key = `${outputKey}.mp3`;
      await run("ffmpeg", ["-y", "-loglevel", "error", "-i", wavPath, "-ac", "1", "-b:a", "32k", storagePath(mp3Key)]);
      key = mp3Key;
      mime = "audio/mpeg";
    } catch {
      // ffmpeg is optional; WAV is larger but plays everywhere.
    }
    const size = (await stat(wavPath)).size;
    // 16-bit mono 22050 Hz WAV from eSpeak: bytes / 44100 = seconds.
    return { audioReference: key, mimeType: mime, durationSeconds: Math.round((size / 44100) * 10) / 10, provider: "espeak", voice, status: "READY" };
  }
}

function runWithStdin(cmd: string, args: string[], input: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = execFile(cmd, args, { timeout: 20000 }, (error) => (error ? reject(error) : resolve()));
    child.stdin?.end(input);
  });
}
