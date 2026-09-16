import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/session";
import { reportRows } from "@/server/services/analytics";
import { REPORTS } from "@/lib/reports";
import { PageHeader } from "@/components/layout/page-header";
import { AdminTable, Row, Cell } from "@/components/admin/table";
import { ReportControls } from "./report-controls";

export const metadata: Metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ report?: string; from?: string; to?: string }> }) {
  const [sp] = await Promise.all([searchParams, requirePermission("reports.export")]);
  const report = REPORTS.find((r) => r.key === sp.report) ?? REPORTS[0]!;
  const from = sp.from ? new Date(sp.from) : undefined;
  const to = sp.to ? new Date(`${sp.to}T23:59:59`) : undefined;
  const rows = await reportRows(report.key, { from: from && !Number.isNaN(from.getTime()) ? from : undefined, to: to && !Number.isNaN(to.getTime()) ? to : undefined });
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  const preview = rows.slice(0, 50);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Reports" description="Generate institute reports and export them as CSV, Excel or PDF." />
      <ReportControls reports={REPORTS.map(({ key, label, description }) => ({ key, label, description }))} active={report.key} from={sp.from ?? ""} to={sp.to ?? ""} total={rows.length} />
      {rows.length ? (
        <>
          <AdminTable headers={headers} dense>
            {preview.map((r, i) => (
              <Row key={i}>{headers.map((h) => <Cell key={h} className="whitespace-nowrap px-3 py-2 text-caption">{r[h] === null || r[h] === undefined || r[h] === "" ? undefined : String(r[h])}</Cell>)}</Row>
            ))}
          </AdminTable>
          {rows.length > preview.length ? <p className="text-caption text-fg-muted">Showing the first {preview.length} of {rows.length} rows. Export to get the full report.</p> : null}
        </>
      ) : (
        <div className="surface p-8 text-center text-body-sm text-fg-muted">No rows match this report and date range.</div>
      )}
    </div>
  );
}
