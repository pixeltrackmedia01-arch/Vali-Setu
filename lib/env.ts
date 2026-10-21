import { z } from "zod";

/**
 * Server-only configuration. Provider keys are read here and nowhere else, and
 * this module is never imported from client components.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  APP_MODE: z.enum(["demo", "live"]).default("demo"),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(8),
  ENABLE_DEMO_ROLE_SWITCHER: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  /** Hosted public demo: allows the demo sign-in helpers in a production build. Requires APP_MODE=demo. */
  PUBLIC_DEMO: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  AI_PROVIDER: z.enum(["demo", "anthropic"]).default("demo"),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-5-5"),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  TRANSLATION_PROVIDER: z.enum(["demo", "ai"]).default("demo"),
  SPEECH_PROVIDER: z.enum(["demo", "espeak"]).default("demo"),
  ESPEAK_BINARY: z.string().default("espeak-ng"),
  OCR_PROVIDER: z.enum(["none"]).default("none"),
  MESSAGING_PROVIDER: z.enum(["demo", "whatsapp", "sms", "voice"]).default("demo"),
  LIVE_DISPATCH_ENABLED: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  WHATSAPP_API_URL: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  SMS_API_URL: z.string().optional(),
  SMS_API_KEY: z.string().optional(),
  SMS_SENDER_ID: z.string().optional(),
  SMS_DLT_ENTITY_ID: z.string().optional(),
  VOICE_API_URL: z.string().optional(),
  VOICE_API_KEY: z.string().optional(),
  WEBHOOK_SECRET: z.string().optional(),
  UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(5 * 1024 * 1024),
  STORAGE_DIR: z.string().default("storage"),
  DATA_RETENTION_DAYS: z.coerce.number().int().positive().default(365),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function env(): Env {
  if (!cached) cached = schema.parse(process.env);
  return cached;
}

export function isDemoMode(): boolean {
  return env().APP_MODE === "demo";
}
