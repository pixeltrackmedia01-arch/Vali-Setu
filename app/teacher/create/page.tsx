import { NoticeForm } from "@/components/notices/NoticeForm";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/guard";
import { env } from "@/lib/env";
import { getT } from "@/lib/i18n/server";
import { classOptionsFor } from "@/services/notices/class-options";

export const metadata = { title: "Create notice" };

export default async function CreateNotice() {
  const user = await requireUser(["TEACHER", "HEAD_TEACHER"]);
  const { t } = await getT();
  const classes = await classOptionsFor(user);
  return (
    <>
      <PageHeader title={t("wizard.newTitle")} description={t("wizard.stepOf", { step: 1, total: 6 })} />
      <NoticeForm classes={classes} maxUploadMb={Math.round(env().UPLOAD_MAX_BYTES / (1024 * 1024))} />
    </>
  );
}
