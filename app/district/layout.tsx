import { AppShell } from "@/components/layout/AppShell";
import { requireUser } from "@/lib/auth/guard";

export default async function RegionLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["DISTRICT_OFFICIAL"]);
  return <AppShell user={user}>{children}</AppShell>;
}
