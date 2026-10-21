import type { AnalyticsFilters } from "@/services/analytics";

/** Parse dashboard filters from URL search params. Unknown values are ignored. */
export function parseFilters(q: Record<string, string | string[] | undefined>): AnalyticsFilters {
  const s = (k: string) => {
    const v = q[k];
    const one = Array.isArray(v) ? v[0] : v;
    return one && one.length <= 100 ? one : undefined;
  };
  const date = (k: string, endOfDay = false) => {
    const v = s(k);
    if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
    // Dates are picked in IST; convert the day boundary to UTC.
    return new Date(`${v}T${endOfDay ? "23:59:59" : "00:00:00"}+05:30`);
  };
  return {
    schoolId: s("school"),
    block: s("block"),
    classSectionId: s("class"),
    section: s("section"),
    language: s("language"),
    channel: s("channel"),
    category: s("category"),
    status: s("status"),
    from: date("from"),
    to: date("to", true),
  };
}
