import type { Tx } from "@/lib/db";
import { db } from "@/lib/db";
import type { Channel, Language } from "@/lib/domain/constants";
import { safeJson, splitList } from "@/lib/utils";

export interface PlannedRecipient {
  guardianId: string;
  displayName: string;
  phone: string | null;
  channel: Channel;
  language: Language;
  /** Why this recipient will not be messaged, if so. */
  skipReason: "NO_CONSENT" | "NO_CONTACT" | null;
}

/**
 * Resolve who a notice goes to. Guardians must be authorised for an active
 * student in one of the notice's classes; SELECTED mode narrows that set and
 * can never widen it, so a crafted guardian id from another school is ignored.
 */
export async function planRecipients(
  notice: {
    id: string;
    schoolId: string;
    recipientMode: string;
    selectedGuardianIds: string;
    targetLanguages: string;
    channels: string;
    priority: string;
  },
  client: Tx | typeof db = db,
): Promise<PlannedRecipient[]> {
  const classIds = (await client.noticeClass.findMany({ where: { noticeId: notice.id }, select: { classSectionId: true } })).map(
    (c) => c.classSectionId,
  );
  if (classIds.length === 0) return [];

  const links = await client.studentGuardian.findMany({
    where: {
      authStatus: "AUTHORIZED",
      student: { status: "ACTIVE", schoolId: notice.schoolId, classSectionId: { in: classIds } },
    },
    include: { guardian: true },
  });

  const selected = notice.recipientMode === "SELECTED" ? new Set(safeJson<string[]>(notice.selectedGuardianIds, [])) : null;
  const languages = splitList(notice.targetLanguages) as Language[];
  const channels = splitList(notice.channels) as Channel[];
  const seen = new Set<string>();
  const out: PlannedRecipient[] = [];

  for (const { guardian } of links) {
    if (seen.has(guardian.id)) continue;
    seen.add(guardian.id);
    if (selected && !selected.has(guardian.id)) continue;

    const language = (languages.includes(guardian.preferredLanguage as Language) ? guardian.preferredLanguage : languages[0]) as Language;
    const preferred = guardian.preferredChannel as Channel;
    // Urgent notices go out on every selected channel; others use the family's preferred one.
    const recipientChannels: Channel[] =
      notice.priority === "URGENT" ? channels : [channels.includes(preferred) ? preferred : channels[0]!];

    for (const channel of recipientChannels) {
      out.push({
        guardianId: guardian.id,
        displayName: guardian.displayName,
        phone: guardian.phone,
        channel,
        language,
        skipReason: guardian.consentStatus !== "GRANTED" ? "NO_CONSENT" : !guardian.phone ? "NO_CONTACT" : null,
      });
    }
  }
  return out;
}

export function countDeliverable(plan: PlannedRecipient[]): number {
  return new Set(plan.filter((p) => !p.skipReason).map((p) => p.guardianId)).size;
}
