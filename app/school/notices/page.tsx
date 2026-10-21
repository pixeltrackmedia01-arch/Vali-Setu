import { NoticesListView } from "@/components/notices/NoticesListView";
import { requireUser } from "@/lib/auth/guard";

export const metadata = { title: "Notices" };

export default async function SchoolNotices({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser(["HEAD_TEACHER", "SCHOOL_ADMIN"]);
  return <NoticesListView user={user} q={await searchParams} basePath="/school/notices" />;
}
