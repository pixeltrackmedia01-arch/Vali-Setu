import Link from "next/link";
import { PhoneCall } from "lucide-react";
import { StatusBadge } from "@/components/notices/StatusBadge";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import type { SessionUser } from "@/lib/auth/session";
import { LANGUAGE_NATIVE_NAME, isLanguage } from "@/lib/domain/constants";
import { getT } from "@/lib/i18n/server";
import { cn, formatDate } from "@/lib/utils";
import { listQuestions } from "@/services/school";
import { QuestionActions } from "./QuestionActions";

const FILTERS = ["OPEN", "ANSWERED", "CLOSED"] as const;

/** Parent questions inbox shared by teacher and school admin views. */
export async function ResponsesView({ user, status, basePath }: { user: SessionUser; status?: string; basePath: string }) {
  const { t, locale } = await getT();
  const active = FILTERS.includes(status as (typeof FILTERS)[number]) ? status : "OPEN";
  const questions = await listQuestions(user, active);
  return (
    <>
      <PageHeader title={t("responses.title")} />
      <nav className="mb-4 flex gap-2" aria-label={t("common.filter")}>
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={`${basePath}?status=${f}`}
            aria-current={active === f ? "page" : undefined}
            className={cn("rounded-full border px-4 py-2 text-sm", active === f ? "border-navy-600 bg-navy-600 text-white" : "border-line bg-white hover:bg-navy-50")}
          >
            {t(`status.${f}`)}
          </Link>
        ))}
      </nav>
      {questions.length === 0 ? (
        <EmptyState title={t("responses.none")} />
      ) : (
        <ul className="space-y-3">
          {questions.map((q) => (
            <li key={q.id}>
              <Card as="article">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{q.guardian.displayName}</p>
                  {isLanguage(q.guardian.preferredLanguage) && <Badge>{LANGUAGE_NATIVE_NAME[q.guardian.preferredLanguage]}</Badge>}
                  <StatusBadge status={q.status} label={t(`status.${q.status as "OPEN"}`)} />
                  {q.callbackRequested && (
                    <Badge tone="warn">
                      <PhoneCall className="h-3 w-3" aria-hidden /> {t("responses.callback")}
                    </Badge>
                  )}
                  <span className="ml-auto text-xs text-ink-muted">{formatDate(q.createdAt, locale, true)}</span>
                </div>
                <p className="mt-1 text-sm">
                  <span className="text-ink-muted">{t("record.title")}: </span>
                  <Link className="text-navy-700 underline" href={`/notices/${q.notice.id}/record`}>
                    {q.notice.title}
                  </Link>
                </p>
                <p className="mt-2 text-sm font-medium">{q.questionCategory ? t(`responses.categories.${q.questionCategory as "OTHER"}`) : t("responses.question")}</p>
                {q.message && <p className="mt-1 whitespace-pre-wrap rounded-md bg-gray-50 p-2 text-sm">{q.message}</p>}
                {q.status === "OPEN" ? (
                  <QuestionActions id={q.id} guardianId={q.guardian.id} noticeId={q.notice.id} existingReply={q.staffReply} />
                ) : (
                  q.staffReply && <p className="mt-2 text-sm text-success-700">↳ {q.staffReply}</p>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
