/**
 * Pre-generates the sample recordings used by the demo speech provider, using
 * eSpeak NG (free, offline). Run once after changing demo-content.ts:
 *   npm run audio:demo
 * The resulting MP3 files and manifest are committed so a fresh install plays
 * sample audio without any speech provider.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, statSync, writeFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { DEMO_SAMPLES } from "../services/ai/demo-content";
import { textHash } from "../services/speech/demo";

const VOICES: Record<string, string> = { gu: "gu", hi: "hi", en: "en-us" };
const outDir = path.resolve("storage/demo-audio");
mkdirSync(outDir, { recursive: true });

const manifest: Record<string, { file: string; language: string; durationSeconds: number; generator: string }> = {};
for (const sample of DEMO_SAMPLES) {
  for (const [language, text] of Object.entries(sample.translations)) {
    const base = `${sample.key}-${language}`;
    const wav = path.join(outDir, `${base}.wav`);
    execFileSync("espeak-ng", ["-v", VOICES[language]!, "-s", "135", "--stdin", "-w", wav], { input: text });
    const seconds = Math.round((statSync(wav).size / 44100) * 10) / 10;
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", wav, "-ac", "1", "-ar", "22050", "-b:a", "32k", path.join(outDir, `${base}.mp3`)]);
    unlinkSync(wav);
    manifest[textHash(text)] = { file: `${base}.mp3`, language, durationSeconds: seconds, generator: `espeak-ng ${VOICES[language]}` };
    console.log(`${base}.mp3  ${seconds}s`);
  }
}
writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
