import { NoticesListView } from "@/components/notices/NoticesListView";
import { requireUser } from "@/lib/auth/guard";

export const metadata = { title: "Notices" };

export default async function TeacherNotices({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser(["TEACHER", "HEAD_TEACHER"]);
  return <NoticesListView user={user} q={await searchParams} basePath="/teacher/notices" />;
}
