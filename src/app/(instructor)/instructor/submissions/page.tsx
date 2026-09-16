import type { Metadata } from "next";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { instructorScope } from "@/server/services/instructor-scope";
import { listSubmissions } from "@/server/services/assignments";
import { prisma } from "@/server/db/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { SimpleSelectLink } from "@/components/studio/course-filter-link";
import { enumLabel, relativeTime, toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Submissions" };
export const dynamic = "force-dynamic";

export default async function SubmissionsPage({ searchParams }: { searchParams: Promise<{ course?: string; status?: string; page?: string }> }) {
  const [sp, user] = await Promise.all([searchParams, requireUser()]);
  const scope = await instructorScope(user);
  const [courses, list] = await Promise.all([
    prisma.course.findMany({ where: { deletedAt: null, ...scope.courseWhere }, orderBy: { title: "asc" }, select: { id: true, title: true } }),
    listSubmissions({ instructorId: scope.bypass ? undefined : scope.instructorId, courseId: sp.course, status: sp.status as never, page: Number(sp.page ?? 1) || 1 }),
  ]);
  const tabs = [["", "To grade"], ["APPROVED", "Approved"], ["REVISION_REQUESTED", "Revision"], ["REJECTED", "Rejected"]] as const;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Submissions" description="Assignment work waiting for your review, oldest first.">
        <div className="flex flex-wrap items-center gap-3">
          <SimpleSelectLink base="/instructor/submissions" courses={courses} active={sp.course} />
          <div className="flex gap-1">{tabs.map(([v, l]) => <Link key={v} href={`/instructor/submissions?${new URLSearchParams({ ...(sp.course ? { course: sp.course } : {}), ...(v ? { status: v } : {}) }).toString()}`} className={`rounded-full px-3 py-1 text-caption ${(sp.status ?? "") === v ? "bg-accent text-white" : "bg-bg-muted text-fg-muted hover:text-fg"}`}>{l}</Link>)}</div>
        </div>
      </PageHeader>
      {list.items.length ? (
        <ul className="surface divide-y divide-border">
          {list.items.map((s) => (
            <li key={s.id}>
              <Link href={`/instructor/submissions/${s.id}`} className="flex items-center gap-3 p-4 hover:bg-bg-subtle">
                <Avatar name={s.student.user.name} src={s.student.user.avatar?.url} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{s.assignment.title} <span className="font-normal text-fg-muted">· {s.student.user.name}</span></p>
                  <p className="text-caption text-fg-muted">{s.assignment.course.title} · attempt {s.attempt} · {s.submittedAt ? relativeTime(s.submittedAt) : "draft"}{s.isLate ? " · late" : ""}{s.score != null ? ` · ${toNumber(s.score)}/${toNumber(s.assignment.maxPoints)}` : ""}</p>
                </div>
                <Badge variant={statusVariant(s.status)}>{enumLabel(s.status)}</Badge>
                <Button size="sm" variant="secondary">Open</Button>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<Inbox />} title="You're all caught up." description="No submissions match this filter." />
      )}
      <Pagination page={list.page} pageSize={list.pageSize} total={list.total} hrefFor={(p) => `/instructor/submissions?page=${p}${sp.course ? `&course=${sp.course}` : ""}${sp.status ? `&status=${sp.status}` : ""}`} />
    </div>
  );
}
