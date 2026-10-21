import { AppShell } from "@/components/layout/AppShell";
import { requireUser } from "@/lib/auth/guard";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["TEACHER", "HEAD_TEACHER"]);
  return <AppShell user={user}>{children}</AppShell>;
}
