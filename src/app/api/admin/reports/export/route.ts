import { z } from "zod";
import { handle } from "@/lib/api/respond";
import { requireApiPermission } from "@/server/api/principal";
import { reportRows, toCsv, toExcel, toPdfTable } from "@/server/services/analytics";
import { REPORTS, REPORT_FORMATS } from "@/lib/reports";
import { audit } from "@/server/audit";

const schema = z.object({
  report: z.enum(REPORTS.map((r) => r.key) as [string, ...string[]]),
  format: z.enum(REPORT_FORMATS).default("csv"),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const maxDuration = 60;

/** GET /api/admin/reports/export?report=students&format=csv|xlsx|pdf&from=&to= */
export const GET = handle(async (req) => {
  const user = await requireApiPermission(req, "reports.export");
  const url = new URL(req.url);
  const input = schema.parse({ report: url.searchParams.get("report"), format: url.searchParams.get("format") ?? "csv", from: url.searchParams.get("from") || undefined, to: url.searchParams.get("to") ? `${url.searchParams.get("to")}T23:59:59` : undefined });
  const def = REPORTS.find((r) => r.key === input.report)!;
  const rows = await reportRows(def.key, { from: input.from, to: input.to });
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `globify-${def.key}-${stamp}.${input.format}`;
  await audit({ actorId: user.id, actorRoles: user.roles, action: "report.export", entityType: "Report", entityId: def.key, after: { format: input.format, rows: rows.length, from: input.from ?? null, to: input.to ?? null } });

  let body: BodyInit;
  let type: string;
  if (input.format === "csv") {
    body = `﻿${toCsv(rows)}`;
    type = "text/csv; charset=utf-8";
  } else if (input.format === "xlsx") {
    body = new Uint8Array(await toExcel(rows, def.label));
    type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  } else {
    body = new Uint8Array(await toPdfTable(`${def.label} report`, rows));
    type = "application/pdf";
  }
  return new Response(body, { headers: { "Content-Type": type, "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store" } });
});
