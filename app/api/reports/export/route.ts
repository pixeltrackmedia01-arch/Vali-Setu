import { NextResponse } from "next/server";
import { apiRoute, searchParams } from "@/lib/api/handler";
import { parseFilters } from "@/lib/api/filters";
import { AppError } from "@/services/errors";
import { buildExport, type ExportType } from "@/services/reports/export";

const TYPES: ExportType[] = ["deliveries", "notices", "contacts", "region"];

export const GET = apiRoute({}, async ({ req, user }) => {
  const q = searchParams(req);
  const type = q.type as ExportType;
  if (!TYPES.includes(type)) throw new AppError("BAD_TYPE", "Unknown report type.", 400);
  const { filename, csv } = await buildExport(user, type, parseFilters(q));
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
});
