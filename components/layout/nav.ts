import type { Role } from "@/lib/domain/constants";
import type { MessageKey } from "@/lib/i18n";

export interface NavItem {
  href: string;
  label: MessageKey;
  icon: "home" | "plus" | "file" | "clock" | "check" | "history" | "message" | "settings" | "chart" | "users" | "school" | "layers" | "download";
}

export const NAV: Record<Exclude<Role, "PARENT">, NavItem[]> = {
  TEACHER: [
    { href: "/teacher/dashboard", label: "nav.overview", icon: "home" },
    { href: "/teacher/create", label: "nav.create", icon: "plus" },
    { href: "/teacher/notices?status=DRAFT", label: "nav.drafts", icon: "file" },
    { href: "/teacher/notices?status=PENDING_APPROVAL", label: "nav.pending", icon: "clock" },
    { href: "/teacher/notices?status=APPROVED", label: "nav.approved", icon: "check" },
    { href: "/teacher/notices?status=DISPATCHED", label: "nav.history", icon: "history" },
    { href: "/teacher/responses", label: "nav.responses", icon: "message" },
    { href: "/teacher/settings", label: "nav.settings", icon: "settings" },
  ],
  HEAD_TEACHER: [
    { href: "/school/dashboard", label: "nav.schoolDashboard", icon: "chart" },
    { href: "/teacher/dashboard", label: "nav.overview", icon: "home" },
    { href: "/teacher/notices?status=PENDING_APPROVAL", label: "nav.pending", icon: "clock" },
    { href: "/teacher/create", label: "nav.create", icon: "plus" },
    { href: "/teacher/notices", label: "nav.history", icon: "history" },
    { href: "/teacher/responses", label: "nav.responses", icon: "message" },
    { href: "/school/parents", label: "nav.parents", icon: "users" },
    { href: "/school/classes", label: "nav.classes", icon: "layers" },
    { href: "/school/reports", label: "nav.reports", icon: "download" },
    { href: "/teacher/settings", label: "nav.settings", icon: "settings" },
  ],
  SCHOOL_ADMIN: [
    { href: "/school/dashboard", label: "nav.schoolDashboard", icon: "chart" },
    { href: "/school/notices", label: "nav.history", icon: "history" },
    { href: "/school/responses", label: "nav.responses", icon: "message" },
    { href: "/school/parents", label: "nav.parents", icon: "users" },
    { href: "/school/classes", label: "nav.classes", icon: "layers" },
    { href: "/school/reports", label: "nav.reports", icon: "download" },
    { href: "/school/settings", label: "nav.settings", icon: "settings" },
  ],
  CRC_OFFICER: [
    { href: "/crc-brc/dashboard", label: "nav.overview", icon: "chart" },
    { href: "/crc-brc/schools", label: "nav.schools", icon: "school" },
    { href: "/crc-brc/reports", label: "nav.reports", icon: "download" },
  ],
  BRC_OFFICER: [
    { href: "/crc-brc/dashboard", label: "nav.overview", icon: "chart" },
    { href: "/crc-brc/schools", label: "nav.schools", icon: "school" },
    { href: "/crc-brc/reports", label: "nav.reports", icon: "download" },
  ],
  DISTRICT_OFFICIAL: [
    { href: "/district/dashboard", label: "nav.overview", icon: "chart" },
    { href: "/district/analytics", label: "nav.analytics", icon: "layers" },
    { href: "/district/reports", label: "nav.reports", icon: "download" },
  ],
};
