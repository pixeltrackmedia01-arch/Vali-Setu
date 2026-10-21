import "server-only";
import { notFound } from "next/navigation";
import type { Actor } from "@/lib/permissions";
import { NotFoundError } from "@/services/errors";
import { getNoticeForActor } from "./index";

/** Page helper: 404 for notices outside the actor's scope (same response as a missing id). */
export async function loadNoticeOr404(actor: Actor, id: string) {
  try {
    return await getNoticeForActor(actor, id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}
