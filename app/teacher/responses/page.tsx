import { ResponsesView } from "@/components/responses/ResponsesView";
import { requireUser } from "@/lib/auth/guard";

export const metadata = { title: "Parent responses" };

export default async function TeacherResponses({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requireUser(["TEACHER", "HEAD_TEACHER"]);
  return <ResponsesView user={user} status={(await searchParams).status} basePath="/teacher/responses" />;
}
