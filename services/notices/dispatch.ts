import { Prisma } from "@prisma/client";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { dispatchEligibility } from "@/lib/domain/workflow";
import { env } from "@/lib/env";
import { can, type Actor } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { AppError, ForbiddenError } from "@/services/errors";
import { getMessagingProvider } from "@/services/providers";
import { getNoticeForActor, readinessFor } from "./index";
import { planRecipients } from "./recipients";

export interface DispatchSummary {
  dispatchId: string;
  mode: "demo" | "live";
  duplicate: boolean;
  totalRecipients: number;
  queued: number;
  delivered: number;
  failed: number;
  skipped: number;
  byLanguage: Record<string, number>;
  byChannel: Record<string, number>;
  followUpRequired: number;
}

const MAX_ATTEMPTS = 2;

/**
 * Dispatch an approved notice. Safe to call twice: the idempotency key and the
 * DISPATCHED state both short-circuit to the original summary. In demo mode the
 * provider never contacts anyone, and delivery outcomes are simulated events.
 */
export async function dispatchNotice(actor: Actor, id: string, idempotencyKey: string, confirmLive = false): Promise<DispatchSummary> {
  if (!can(actor, "notice.dispatch")) throw new ForbiddenError("You are not authorised to dispatch notices.");
  const notice = await getNoticeForActor(actor, id);

  const previous = await db.dispatchRequest.findFirst({
    where: { OR: [{ idempotencyKey }, { noticeId: id }] },
    orderBy: { createdAt: "asc" },
  });
  if (previous) {
    if (previous.noticeId !== id) throw new AppError("IDEMPOTENCY_CONFLICT", "This request key was already used for another notice.", 409);
    if (previous.summaryJson === "{}") throw new AppError("DISPATCH_IN_PROGRESS", "This notice is already being dispatched.", 409);
    return { ...(JSON.parse(previous.summaryJson) as DispatchSummary), duplicate: true };
  }

  const eligibility = dispatchEligibility(await readinessFor(notice));
  if (!eligibility.ok) throw new AppError("NOT_ELIGIBLE", "Only approved notices that passed validation can be dispatched.", 409, eligibility.reasons);

  const provider = getMessagingProvider();
  const mode: "demo" | "live" = provider.simulated ? "demo" : "live";
  if (mode === "live" && (!confirmLive || env().APP_MODE !== "live")) {
    throw new AppError("CONFIRM_LIVE", "Real messages will be sent. Confirm live dispatch to continue.", 409);
  }
  await rateLimit(`dispatch:${actor.id}`, 20, 3600);

  // Claim the dispatch first so a concurrent click fails on the unique key.
  let request;
  try {
    request = await db.dispatchRequest.create({
      data: { noticeId: id, idempotencyKey, requestedById: actor.id, mode, totalRecipients: 0, queued: 0, delivered: 0, failed: 0 },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError("DISPATCH_IN_PROGRESS", "This notice is already being dispatched.", 409);
    }
    throw error;
  }

  const plan = await planRecipients(notice);
  const textByLanguage = new Map(notice.translations.map((t) => [t.language, t.translatedText]));
  const audioByLanguage = new Map(notice.audio.filter((a) => a.status === "READY").map((a) => [a.language, a.id]));
  const summary: DispatchSummary = {
    dispatchId: request.id,
    mode,
    duplicate: false,
    totalRecipients: new Set(plan.map((p) => p.guardianId)).size,
    queued: 0,
    delivered: 0,
    failed: 0,
    skipped: 0,
    byLanguage: {},
    byChannel: {},
    followUpRequired: 0,
  };
  const now = new Date();
  const followUpGuardians = new Set<string>();

  for (const p of plan) {
    const recipient = await db.noticeRecipient.upsert({
      where: { noticeId_guardianId_channel: { noticeId: id, guardianId: p.guardianId, channel: p.channel } },
      create: { noticeId: id, guardianId: p.guardianId, channel: p.channel, language: p.language, simulated: mode === "demo" },
      update: {},
    });
    summary.byLanguage[p.language] = (summary.byLanguage[p.language] ?? 0) + 1;
    summary.byChannel[p.channel] = (summary.byChannel[p.channel] ?? 0) + 1;

    if (p.skipReason) {
      summary.skipped += 1;
      followUpGuardians.add(p.guardianId);
      await db.noticeRecipient.update({ where: { id: recipient.id }, data: { deliveryStatus: "SKIPPED", failureReason: p.skipReason } });
      continue;
    }
    summary.queued += 1;

    let finalStatus: "DELIVERED" | "SENT" | "FAILED" = "FAILED";
    let failure: string | undefined;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const result = await provider.sendMessage({
        recipient: p.phone!,
        channel: p.channel,
        language: p.language,
        text: textByLanguage.get(p.language) ?? "",
        audioUrl: p.channel === "voice" && audioByLanguage.get(p.language) ? `/api/audio/${audioByLanguage.get(p.language)}` : undefined,
        idempotencyKey: `${recipient.id}:${attempt}`,
      });
      const attemptStatus = result.status === "FAILED" ? "FAILED" : result.simulatedOutcome ?? "SENT";
      await db.messageDeliveryAttempt.create({
        data: {
          recipientId: recipient.id,
          provider: provider.id,
          providerMessageId: result.providerMessageId,
          attemptNumber: attempt,
          status: attemptStatus === "SENT" ? "ACCEPTED" : attemptStatus,
          errorCode: result.errorCode,
        },
      });
      if (attemptStatus !== "FAILED") {
        // Live providers report delivery later via the status callback; "SENT" until then.
        finalStatus = attemptStatus;
        failure = undefined;
        break;
      }
      failure = result.errorCode ?? "FAILED";
    }

    await db.noticeRecipient.update({
      where: { id: recipient.id },
      data: {
        deliveryStatus: finalStatus,
        sentAt: finalStatus !== "FAILED" ? now : null,
        deliveredAt: finalStatus === "DELIVERED" ? now : null,
        lastAttemptAt: now,
        failureReason: failure ?? null,
      },
    });
    if (finalStatus === "DELIVERED") summary.delivered += 1;
    if (finalStatus === "FAILED") {
      summary.failed += 1;
      followUpGuardians.add(p.guardianId);
    }
  }

  summary.followUpRequired = followUpGuardians.size;
  if (followUpGuardians.size) {
    await db.followUpTask.createMany({
      data: [...followUpGuardians].map((guardianId) => ({
        schoolId: notice.schoolId,
        noticeId: id,
        guardianId,
        assignedToId: actor.id,
        reason: "Message could not be delivered. Call the family or update their contact details.",
        dueAt: new Date(now.getTime() + 2 * 24 * 3600 * 1000),
      })),
    });
  }

  await db.$transaction(async (tx) => {
    await tx.dispatchRequest.update({
      where: { id: request.id },
      data: {
        totalRecipients: summary.totalRecipients,
        queued: summary.queued,
        delivered: summary.delivered,
        failed: summary.failed,
        summaryJson: JSON.stringify(summary),
      },
    });
    await tx.notice.update({ where: { id }, data: { workflowStatus: "DISPATCHED", dispatchedAt: now } });
    await audit(
      {
        actorId: actor.id,
        entityType: "Notice",
        entityId: id,
        action: mode === "demo" ? "notice.dispatched_demo" : "notice.dispatched_live",
        metadata: { version: notice.version, queued: summary.queued, delivered: summary.delivered, failed: summary.failed, skipped: summary.skipped },
      },
      tx,
    );
  });
  return summary;
}
