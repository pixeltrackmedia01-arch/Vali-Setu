import { z } from "zod";
import { CHANNELS, LANGUAGES, NOTICE_CATEGORIES, PRIORITIES, QUESTION_CATEGORIES } from "@/lib/domain/constants";

const id = z.string().min(1).max(64);

export const noticeInputSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(140),
  category: z.enum(NOTICE_CATEGORIES),
  sourceText: z.string().trim().min(10, "Notice text must be at least 10 characters").max(6000),
  sourceLanguage: z.enum(LANGUAGES).default("en"),
  priority: z.enum(PRIORITIES).default("NORMAL"),
  classSectionIds: z.array(id).min(1, "Select at least one class").max(40),
  recipientMode: z.enum(["CLASS", "SELECTED"]).default("CLASS"),
  selectedGuardianIds: z.array(id).max(500).default([]),
  targetLanguages: z.array(z.enum(LANGUAGES)).min(1, "Choose at least one language"),
  channels: z.array(z.enum(CHANNELS)).min(1, "Choose at least one channel"),
  scheduledAt: z.string().datetime({ offset: true }).nullable().optional(),
});
export type NoticeInput = z.infer<typeof noticeInputSchema>;

export const noticePatchSchema = noticeInputSchema.partial().extend({
  simplifiedText: z.string().trim().max(6000).nullable().optional(),
});
export type NoticePatch = z.infer<typeof noticePatchSchema>;

export const translationEditSchema = z.object({
  language: z.enum(LANGUAGES),
  text: z.string().trim().min(1, "Translation cannot be empty").max(8000),
});

export const translationActionSchema = z.object({
  language: z.enum(LANGUAGES),
  action: z.enum(["generate", "reset", "reject"]),
  reason: z.string().trim().max(500).optional(),
});

export const resolveValidationSchema = z.object({
  validationId: id,
  resolution: z.enum(["REVIEWED", "OVERRIDDEN", "OPEN"]),
  note: z.string().trim().max(500).optional(),
});

export const audioSchema = z.object({ language: z.enum(LANGUAGES), voice: z.string().max(40).optional() });

export const rejectSchema = z.object({ reason: z.string().trim().min(5, "Give a short reason").max(500) });

export const scheduleSchema = z.object({ scheduledAt: z.string().datetime({ offset: true }) });

export const dispatchSchema = z.object({
  idempotencyKey: z.string().min(8).max(100),
  confirmLive: z.boolean().optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(200),
  password: z.string().min(1, "Enter your password").max(200),
});

export const acknowledgeSchema = z.object({ clientKey: z.string().min(8).max(100) });

export const questionSchema = z.object({
  category: z.enum(QUESTION_CATEGORIES),
  message: z.string().trim().max(1000).default(""),
  callbackRequested: z.boolean().default(false),
  clientKey: z.string().min(8).max(100),
});

export const parentPrefsSchema = z.object({
  preferredLanguage: z.enum(LANGUAGES).optional(),
  preferredChannel: z.enum(CHANNELS).optional(),
  urgentOnly: z.boolean().optional(),
  voice: z.boolean().optional(),
  contactCorrectionNote: z.string().trim().max(300).optional(),
});

export const localeSchema = z.object({ locale: z.enum(LANGUAGES) });

export const followUpSchema = z.object({
  guardianId: id.optional(),
  noticeId: id.optional(),
  reason: z.string().trim().min(3).max(300),
  dueAt: z.string().datetime({ offset: true }).optional(),
});

export const followUpUpdateSchema = z.object({ status: z.enum(["OPEN", "DONE"]) });

export const questionReplySchema = z.object({
  reply: z.string().trim().min(1).max(1000),
  status: z.enum(["ANSWERED", "CLOSED"]).default("ANSWERED"),
});
