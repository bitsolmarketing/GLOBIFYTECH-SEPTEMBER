import type { Metadata } from "next";
import Link from "next/link";
import { Boxes } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { instructorScope } from "@/server/services/instructor-scope";
import { prisma } from "@/server/db/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, statusVariant } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { enumLabel, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Batches" };
export const dynamic = "force-dynamic";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function InstructorBatchesPage() {
  const user = await requireUser();
  const scope = await instructorScope(user);
  const batches = await prisma.batch.findMany({ where: { deletedAt: null, ...(scope.bypass ? {} : { OR: [{ instructorId: scope.instructorId ?? "" }, { course: scope.courseWhere }] }) }, orderBy: [{ status: "asc" }, { startDate: "desc" }], include: { course: { select: { title: true } }, campus: { select: { name: true } }, classroom: { select: { name: true } }, schedule: { orderBy: { dayOfWeek: "asc" } }, _count: { select: { students: { where: { leftAt: null } } } } } });
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Batches" description="Cohorts you teach — schedule, capacity and attendance." />
      {batches.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {batches.map((b) => (
            <Link key={b.id} href={`/instructor/batches/${b.id}`} className="surface surface-hover flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-2"><div><p className="text-label text-fg-subtle">{b.code}</p><h2 className="text-h4">{b.name}</h2></div><Badge variant={statusVariant(b.status)}>{enumLabel(b.status)}</Badge></div>
              <p className="text-body-sm text-fg-muted">{b.course.title}</p>
              <p className="text-caption text-fg-muted">{enumLabel(b.mode)} · {b.campus?.name ?? "Online"}{b.classroom ? ` · ${b.classroom.name}` : ""}</p>
              <p className="text-caption text-fg-muted">{b.schedule.map((s) => `${DAYS[s.dayOfWeek]} ${s.startTime}–${s.endTime}`).join(" · ") || "Schedule TBA"}</p>
              <p className="mt-auto text-caption text-fg-subtle">{formatDate(b.startDate)}{b.endDate ? ` – ${formatDate(b.endDate)}` : ""} · {b._count.students}/{b.capacity} students</p>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState icon={<Boxes />} title="No batches assigned." description="Batches are created by academic managers under Admin → Batches." />
      )}
    </div>
  );
}
