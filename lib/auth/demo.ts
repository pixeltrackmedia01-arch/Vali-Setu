import { env } from "@/lib/env";
import type { Role } from "@/lib/domain/constants";

/** Seeded fictional accounts listed on the login page in demo mode. */
export const DEMO_ACCOUNTS: { email: string; role: Role; name: string }[] = [
  { email: "teacher@valisetu.example", role: "TEACHER", name: "Asha Desai" },
  { email: "teacher2@valisetu.example", role: "TEACHER", name: "Rakesh Joshi" },
  { email: "headteacher@valisetu.example", role: "HEAD_TEACHER", name: "Kiran Mehta" },
  { email: "admin@valisetu.example", role: "SCHOOL_ADMIN", name: "Farida Shaikh" },
  { email: "crc@valisetu.example", role: "CRC_OFFICER", name: "Vijay Nakum" },
  { email: "brc@valisetu.example", role: "BRC_OFFICER", name: "Sejal Trivedi" },
  { email: "district@valisetu.example", role: "DISTRICT_OFFICIAL", name: "Anil Bhatt" },
  { email: "parent@valisetu.example", role: "PARENT", name: "Meena Parmar" },
  { email: "parent.hi@valisetu.example", role: "PARENT", name: "Sunita Yadav" },
];

/** Demo sign-in helpers are off in production builds unless this is an explicitly hosted public demo. */
function demoHelpersAllowed(): boolean {
  const e = env();
  return e.APP_MODE === "demo" && (e.NODE_ENV !== "production" || e.PUBLIC_DEMO);
}

export function demoSwitcherEnabled(): boolean {
  return demoHelpersAllowed() && Boolean(env().ENABLE_DEMO_ROLE_SWITCHER);
}

/** The demo password is only shown outside production, or on a hosted public demo. */
export function demoPassword(): string | null {
  return demoHelpersAllowed() ? process.env.SEED_DEMO_PASSWORD || "ValiSetu@2026" : null;
}
