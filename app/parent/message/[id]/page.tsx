import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ParentMessageView } from "@/components/parent/ParentMessageView";
import { Badge } from "@/components/ui";
import { requireUser } from "@/lib/auth/guard";
import type { NoticeCategory } from "@/lib/domain/constants";
import { getT } from "@/lib/i18n/server";
import { formatDate } from "@/lib/utils";
import { NotFoundError } from "@/services/errors";
import { getParentMessage } from "@/services/parent";

export const metadata = { title: "Message" };

export default async function ParentMessage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(["PARENT"]);
  const { t, locale } = await getT();
  const { id } = await params;
  const data = await getParentMessage(user, id).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });
  const { notice } = data;
  return (
    <>
      <Link href="/parent/messages" className="mb-3 inline-flex min-h-11 items-center gap-1 text-navy-700">
        <ArrowLeft className="h-4 w-4" aria-hidden /> {t("parent.backToMessages")}
      </Link>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {notice.priority === "URGENT" && <Badge tone="danger">{t("parent.urgent")}</Badge>}
        <Badge>{t(`category.${notice.category as NoticeCategory}`)}</Badge>
        <span className="text-sm text-ink-muted">
          {notice.school.name} · {formatDate(notice.dispatchedAt, locale)}
        </span>
      </div>
      <h1 className="sr-only">{notice.title}</h1>
      <ParentMessageView
        noticeId={notice.id}
        versions={data.versions.map((v) => ({ ...v, audio: v.audio ? { id: v.audio.id, status: v.audio.status, provider: v.audio.provider } : null }))}
        defaultLanguage={data.defaultLanguage}
        acknowledged={data.acknowledged}
        questions={data.questions.map((q) => ({ id: q.id, category: q.questionCategory ?? "OTHER", message: q.message, status: q.status, reply: q.staffReply }))}
        helpline={notice.school.helpline}
      />
    </>
  );
}
