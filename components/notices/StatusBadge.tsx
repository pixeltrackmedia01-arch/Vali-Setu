import { Badge, type Tone } from "@/components/ui";

const TONES: Record<string, Tone> = {
  DRAFT: "neutral",
  PENDING_APPROVAL: "warn",
  APPROVED: "info",
  SCHEDULED: "info",
  DISPATCHED: "success",
  REJECTED: "danger",
  QUEUED: "neutral",
  SENT: "info",
  DELIVERED: "success",
  FAILED: "danger",
  SKIPPED: "warn",
  MATCHED: "success",
  MISMATCH: "danger",
  MISSING: "danger",
  ADDITIONAL: "warn",
  NEEDS_REVIEW: "warn",
  UNVERIFIABLE: "neutral",
  OPEN: "warn",
  ANSWERED: "success",
  CLOSED: "neutral",
  DONE: "success",
  URGENT: "danger",
  HIGH: "warn",
  NORMAL: "neutral",
};

export function StatusBadge({ status, label, title }: { status: string; label: string; title?: string }) {
  return (
    <Badge tone={TONES[status] ?? "neutral"} title={title}>
      {label}
    </Badge>
  );
}
