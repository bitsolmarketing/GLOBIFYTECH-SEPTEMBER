import type { Metadata } from "next";
import { Video } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { instructorScope } from "@/server/services/instructor-scope";
import { liveClassesForInstructor } from "@/server/services/live-classes";
import { prisma } from "@/server/db/prisma";
import { env } from "@/config/env";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, statusVariant } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ScheduleLiveClassDialog, LiveClassActions } from "@/components/studio/live-class-forms";
import { enumLabel, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Live classes" };
export const dynamic = "force-dynamic";

export default async function InstructorLiveClassesPage({ searchParams }: { searchParams: Promise<{ new?: string; batch?: string }> }) {
  const [sp, user] = await Promise.all([searchParams, requireUser()]);
  const scope = await instructorScope(user);
  const [classes, courses, batches] = await Promise.all([
    liveClassesForInstructor(scope.instructorId, scope.bypass),
    prisma.course.findMany({ where: { deletedAt: null, ...scope.courseWhere }, orderBy: { title: "asc" }, select: { id: true, title: true } }),
    prisma.batch.findMany({ where: { deletedAt: null, status: { in: ["PLANNED", "OPEN", "RUNNING"] }, course: scope.courseWhere }, select: { id: true, name: true, courseId: true } }),
  ]);
  const upcoming = classes.filter((c) => c.status === "SCHEDULED" || c.status === "LIVE").sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const past = classes.filter((c) => c.status === "COMPLETED" || c.status === "CANCELLED");
  const row = (c: (typeof classes)[number]) => (
    <li key={c.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent"><Video className="size-4" /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{c.title}</p>
        <p className="text-caption text-fg-muted">{c.course.title}{c.batch ? ` · ${c.batch.name} (${c.batch._count.students} students)` : " · all students"} · {formatDateTime(c.startsAt)} · {enumLabel(c.provider)}{c.meetingUrl ? "" : " · no link yet"} · {c._count.attendance} attended</p>
      </div>
      <Badge variant={statusVariant(c.status)}>{enumLabel(c.status)}</Badge>
      <LiveClassActions liveClass={{ id: c.id, status: c.status, notes: c.notes, hasRecording: c.recordings.length > 0 }} />
    </li>
  );
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Live classes" description="Schedule sessions, share links, attach recordings and let AI summarise." actions={<ScheduleLiveClassDialog courses={courses} batches={batches} defaultOpen={sp.new === "1"} defaultBatchId={sp.batch} liveDriver={env().LIVE_CLASS_DRIVER} />} />
      <section className="flex flex-col gap-2">
        <h2 className="text-label text-fg-subtle">Upcoming</h2>
        {upcoming.length ? <ul className="surface divide-y divide-border">{upcoming.map(row)}</ul> : <EmptyState compact icon={<Video />} title="Nothing scheduled." />}
      </section>
      {past.length ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-label text-fg-subtle">Past</h2>
          <ul className="surface divide-y divide-border">{past.slice(0, 30).map(row)}</ul>
        </section>
      ) : null}
    </div>
  );
}
