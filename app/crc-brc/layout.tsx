import { AppShell } from "@/components/layout/AppShell";
import { requireUser } from "@/lib/auth/guard";

export default async function RegionLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["CRC_OFFICER", "BRC_OFFICER"]);
  return <AppShell user={user}>{children}</AppShell>;
}
