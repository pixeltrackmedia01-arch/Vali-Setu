export const LANGUAGES = ["gu", "hi", "en"] as const;
export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_LOCALE: Record<Language, string> = {
  gu: "gu-IN",
  hi: "hi-IN",
  en: "en-IN",
};

/** Endonyms are shown so a parent recognises their own language. */
export const LANGUAGE_NATIVE_NAME: Record<Language, string> = {
  gu: "ગુજરાતી",
  hi: "हिन्दी",
  en: "English",
};

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (LANGUAGES as readonly string[]).includes(value);
}

export const ROLES = [
  "TEACHER",
  "HEAD_TEACHER",
  "SCHOOL_ADMIN",
  "CRC_OFFICER",
  "BRC_OFFICER",
  "DISTRICT_OFFICIAL",
  "PARENT",
] as const;
export type Role = (typeof ROLES)[number];

export const NOTICE_CATEGORIES = [
  "ATTENDANCE",
  "EXAMINATION",
  "PTM",
  "HOLIDAY",
  "SCHOLARSHIP",
  "DOCUMENTS",
  "FEES",
  "EVENT",
  "SAFETY",
  "EMERGENCY",
  "OTHER",
] as const;
export type NoticeCategory = (typeof NOTICE_CATEGORIES)[number];

export const PRIORITIES = ["NORMAL", "HIGH", "URGENT"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const CHANNELS = ["whatsapp", "sms", "voice"] as const;
export type Channel = (typeof CHANNELS)[number];

export const WORKFLOW_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "SCHEDULED",
  "DISPATCHED",
] as const;
export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

export const DELIVERY_STATUSES = ["QUEUED", "SENT", "DELIVERED", "FAILED", "SKIPPED"] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const VALIDATION_STATUSES = [
  "MATCHED",
  "MISMATCH",
  "MISSING",
  "ADDITIONAL",
  "NEEDS_REVIEW",
  "UNVERIFIABLE",
] as const;
export type ValidationStatus = (typeof VALIDATION_STATUSES)[number];

export const QUESTION_CATEGORIES = [
  "NOT_UNDERSTOOD",
  "DATE_TIME",
  "DOCUMENTS",
  "CANNOT_ATTEND",
  "OTHER",
] as const;
export type QuestionCategory = (typeof QUESTION_CATEGORIES)[number];

export const ACADEMIC_YEAR = "2026-27";
export const DISPLAY_TIMEZONE = "Asia/Kolkata";
export const DEMO_DISTRICT = "Devbhumi Dwarka";
