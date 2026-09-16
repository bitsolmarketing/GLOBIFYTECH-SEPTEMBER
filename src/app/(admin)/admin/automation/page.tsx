import type { Metadata } from "next";
import { Zap, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { requirePermission } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { env } from "@/config/env";
import { PageHeader } from "@/components/layout/page-header";
import { AdminTable, Row, Cell } from "@/components/admin/table";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { RunJobsButton } from "./run-jobs-button";
import { daysAgo, enumLabel, formatDateTime, relativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Automation" };
export const dynamic = "force-dynamic";

const SCHEDULE = [
  { name: "Risk scoring", detail: "Scores every active enrollment on inactivity, attendance, quizzes and payments.", cadence: "Nightly" },
  { name: "Payment reminders", detail: "Flags overdue invoices and reminds students before the due date.", cadence: "Daily" },
  { name: "Scheduled publishing", detail: "Publishes pages, posts and stories whose schedule has passed.", cadence: "Every 15 minutes" },
  { name: "Class reminders", detail: "Notifies students before a live class starts.", cadence: "Hourly" },
  { name: "Lead follow-up digest", detail: "Alerts admissions about leads untouched for 24 hours.", cadence: "Daily" },
  { name: "Backup heartbeat", detail: "Confirms the database backup ran and alerts if it did not.", cadence: "Daily" },
];

export default async function AutomationPage() {
  await requirePermission("automation.manage");
  const [webhooks, failedNotifications, riskRun, lastBackup] = await Promise.all([
    prisma.webhookEvent.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.notification.count({ where: { status: "FAILED", createdAt: { gte: daysAgo(7) } } }),
    prisma.studentRiskScore.findFirst({ orderBy: { computedAt: "desc" }, select: { computedAt: true } }),
    prisma.setting.findUnique({ where: { key: "backup.lastHeartbeat" }, select: { value: true, updatedAt: true } }),
  ]);
  const e = env();
  const queue = e.REDIS_URL ? "Redis + BullMQ worker" : "In-process (no Redis configured)";
  const unprocessed = webhooks.filter((w) => !w.processedAt).length;
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Automation" description="Scheduled jobs, webhooks and background processing." actions={<RunJobsButton />} />
      {!e.REDIS_URL ? <Alert variant="warning" title="No Redis configured"><span>Jobs run in the web process. Set REDIS_URL and run the worker for reliable retries and scheduling.</span></Alert> : null}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="surface p-4"><Zap className="size-5 text-accent" /><p className="mt-1 text-sm font-medium">Queue</p><p className="text-caption text-fg-muted">{queue}</p></div>
        <div className="surface p-4"><Clock className="size-5 text-info" /><p className="mt-1 text-sm font-medium">Risk engine</p><p className="text-caption text-fg-muted">{riskRun ? `last run ${relativeTime(riskRun.computedAt)}` : "never run"}</p></div>
        <div className="surface p-4"><AlertTriangle className={failedNotifications ? "size-5 text-danger" : "size-5 text-fg-subtle"} /><p className="mt-1 text-sm font-medium">Failed notifications</p><p className="text-caption text-fg-muted">{failedNotifications} in the last 7 days</p></div>
        <div className="surface p-4"><CheckCircle2 className={lastBackup ? "size-5 text-success" : "size-5 text-warning"} /><p className="mt-1 text-sm font-medium">Database backup</p><p className="text-caption text-fg-muted">{lastBackup ? relativeTime(lastBackup.updatedAt) : "no heartbeat received"}</p></div>
      </section>
      <section>
        <p className="text-h4 mb-3">Scheduled jobs</p>
        <AdminTable headers={["Job", "What it does", "Cadence"]}>
          {SCHEDULE.map((s) => (
            <Row key={s.name}>
              <Cell className="font-medium">{s.name}</Cell>
              <Cell muted>{s.detail}</Cell>
              <Cell><Badge>{s.cadence}</Badge></Cell>
            </Row>
          ))}
        </AdminTable>
        <p className="mt-2 text-caption text-fg-subtle">Trigger these from your scheduler by calling the internal cron endpoint with the shared secret, or run the worker process.</p>
      </section>
      <section>
        <div className="mb-3 flex items-center justify-between"><p className="text-h4">Webhook events</p>{unprocessed ? <Badge variant="warning">{unprocessed} unprocessed</Badge> : <Badge variant="success">All processed</Badge>}</div>
        {webhooks.length ? (
          <AdminTable headers={["Provider", "Type", "Received", "Processed", "Status"]} dense>
            {webhooks.map((w) => (
              <Row key={w.id}>
                <Cell className="font-medium">{enumLabel(w.provider)}</Cell>
                <Cell className="text-caption text-fg-muted">{w.type}</Cell>
                <Cell className="text-caption text-fg-muted">{formatDateTime(w.createdAt)}</Cell>
                <Cell className="text-caption text-fg-muted">{w.processedAt ? relativeTime(w.processedAt) : "—"}</Cell>
                <Cell>{w.error ? <Badge variant={statusVariant("FAILED")}>{w.error.slice(0, 40)}</Badge> : w.processedAt ? <Badge variant="success">Processed</Badge> : <Badge variant="warning">Pending</Badge>}</Cell>
              </Row>
            ))}
          </AdminTable>
        ) : <p className="surface p-6 text-body-sm text-fg-muted">No webhooks received yet. Payment and WhatsApp providers post here once configured.</p>}
      </section>
    </div>
  );
}
