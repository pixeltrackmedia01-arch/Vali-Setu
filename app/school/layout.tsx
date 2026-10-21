import { AppShell } from "@/components/layout/AppShell";
import { requireUser } from "@/lib/auth/guard";

export default async function SchoolLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["HEAD_TEACHER", "SCHOOL_ADMIN"]);
  return <AppShell user={user}>{children}</AppShell>;
}
