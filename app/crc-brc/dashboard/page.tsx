import { RegionView } from "@/components/analytics/RegionView";
import { requireUser } from "@/lib/auth/guard";

export const metadata = { title: "CRC/BRC dashboard" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser(["CRC_OFFICER", "BRC_OFFICER"]);
  return <RegionView user={user} q={await searchParams} basePath="/crc-brc/dashboard" variant="crc" />;
}
