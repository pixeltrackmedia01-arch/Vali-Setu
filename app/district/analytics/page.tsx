import { RegionView } from "@/components/analytics/RegionView";
import { requireUser } from "@/lib/auth/guard";

export const metadata = { title: "Analytics" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser(["DISTRICT_OFFICIAL"]);
  return <RegionView user={user} q={await searchParams} basePath="/district/analytics" variant="analytics" />;
}
