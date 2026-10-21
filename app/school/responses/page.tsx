import { ResponsesView } from "@/components/responses/ResponsesView";
import { requireUser } from "@/lib/auth/guard";

export const metadata = { title: "Parent responses" };

export default async function SchoolResponses({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requireUser(["HEAD_TEACHER", "SCHOOL_ADMIN"]);
  return <ResponsesView user={user} status={(await searchParams).status} basePath="/school/responses" />;
}
