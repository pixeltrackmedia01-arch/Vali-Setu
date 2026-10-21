import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge, EmptyState } from "@/components/ui";
import { requireUser } from "@/lib/auth/guard";
import { LANGUAGE_LOCALE, type NoticeCategory } from "@/lib/domain/constants";
import { getT } from "@/lib/i18n/server";
import { cn, formatDate } from "@/lib/utils";
import { getParentProfile, listParentMessages } from "@/services/parent";

export const metadata = { title: "Messages" };

export default async function ParentMessages() {
  const user = await requireUser(["PARENT"]);
  const { t, locale } = await getT();
  const [messages, profile] = await Promise.all([listParentMessages(user), getParentProfile(user)]);
  const unread = messages.filter((m) => !m.read).length;
  return (
    <>
      <h1 className="text-xl">{t("parent.hello", { name: profile.displayName })}</h1>
      <ul className="mt-1 text-sm text-ink-muted">
        {profile.students.map((s) => (
          <li key={s.studentId}>
            {t("parent.child", { name: s.student.displayName, class: `${s.student.classSection.grade}-${s.student.classSection.section}` })} · {s.student.school.name}
          </li>
        ))}
      </ul>
      <div className="mt-5 flex items-center justify-between">
        <h2 className="text-lg">{t("parent.home")}</h2>
        {unread > 0 && <Badge tone="info">{t("parent.unread", { count: unread })}</Badge>}
      </div>
      {messages.length === 0 ? (
        <div className="mt-3">
          <EmptyState title={t("parent.noMessages")} />
        </div>
      ) : (
        <ul className="mt-3 space-y-3">
          {messages.map((m) => (
            <li key={m.noticeId}>
              <Link
                href={`/parent/message/${m.noticeId}`}
                className={cn("flex items-center gap-3 rounded-lg border bg-white p-4 shadow-card", m.read ? "border-line" : "border-navy-200")}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {!m.read && <Badge tone="info">{t("parent.newBadge")}</Badge>}
                    {m.priority === "URGENT" && <Badge tone="danger">{t("parent.urgent")}</Badge>}
                    <Badge>{t(`category.${m.category as NoticeCategory}`)}</Badge>
                    {m.acknowledged && <Badge tone="success">✓ {t("parent.understood")}</Badge>}
                  </div>
                  <p lang={LANGUAGE_LOCALE[m.language as "gu"]} className={cn("mt-2 line-clamp-2", !m.read && "font-semibold")}>
                    {m.preview}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">{t("parent.received", { date: formatDate(m.dispatchedAt, locale) })}</p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-ink-faint" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
