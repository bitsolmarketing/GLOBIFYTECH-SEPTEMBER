import type { Metadata } from "next";
import Link from "next/link";
import { MessagesSquare, Pin, CheckCircle2, Megaphone } from "lucide-react";
import { requireStudentProfile } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { feedForStudent, announcementsForStudent } from "@/server/services/community";
import { PageHeader } from "@/components/layout/page-header";
import { NewDiscussionButton } from "@/components/lms/community-widgets";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { relativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Community" };
export const dynamic = "force-dynamic";

export default async function CommunityPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string; new?: string; courseId?: string; lessonId?: string }> }) {
  const [sp, { studentId }] = await Promise.all([searchParams, requireStudentProfile()]);
  const [feed, announcements, enrollments, memberships] = await Promise.all([
    feedForStudent(studentId, { page: Number(sp.page ?? 1) || 1, q: sp.q }),
    announcementsForStudent(studentId),
    prisma.enrollment.findMany({ where: { studentId, status: { in: ["ACTIVE", "COMPLETED"] } }, select: { course: { select: { id: true, title: true } } } }),
    prisma.batchStudent.findMany({ where: { studentId, leftAt: null }, select: { batch: { select: { id: true, name: true, code: true } } } }),
  ]);
  const scopes = [
    ...(sp.lessonId && sp.courseId ? [{ value: `lesson:${sp.lessonId}`, label: "This lesson", courseId: sp.courseId, lessonId: sp.lessonId }] : []),
    ...enrollments.map((e) => ({ value: `course:${e.course.id}`, label: e.course.title, courseId: e.course.id })),
    ...memberships.map((m) => ({ value: `batch:${m.batch.id}`, label: `Batch ${m.batch.name}`, batchId: m.batch.id })),
  ];
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Community" description="Course discussions, batch chatter, questions and announcements." actions={scopes.length ? <NewDiscussionButton scopes={scopes} defaultOpen={sp.new === "1"} defaultScope={sp.lessonId ? `lesson:${sp.lessonId}` : sp.courseId ? `course:${sp.courseId}` : undefined} /> : null} />
      <div className="grid gap-6 lg:grid-cols-12">
        <section className="flex flex-col gap-3 lg:col-span-8">
          {feed.items.length ? (
            <ul className="surface divide-y divide-border">
              {feed.items.map((d) => (
                <li key={d.id}>
                  <Link href={`/student/community/${d.id}`} className="flex gap-3 p-4 transition-colors hover:bg-bg-subtle">
                    <Avatar name={d.author.name} src={d.author.avatar?.url} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 font-medium">
                        {d.isPinned ? <Pin className="size-3.5 text-accent" /> : null}
                        <span className="truncate">{d.title}</span>
                        {d.isResolved ? <CheckCircle2 className="size-3.5 text-success" /> : null}
                      </p>
                      <p className="text-caption text-fg-muted">{d.author.name} · {d.course?.title ?? d.batch?.code ?? d.group?.name ?? "General"} · {relativeTime(d.lastReplyAt ?? d.createdAt)}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1 text-caption text-fg-subtle">
                      <span>{d.replyCount} replies</span>
                      {d.isQuestion && !d.isResolved ? <Badge variant="warning">Open question</Badge> : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<MessagesSquare />} title="No discussions yet." description="Ask a question about a lesson or start a conversation with your batch." />
          )}
          <Pagination page={feed.page} pageSize={feed.pageSize} total={feed.total} hrefFor={(p) => `/student/community?page=${p}`} />
        </section>
        <aside className="lg:col-span-4">
          <div className="surface flex flex-col gap-3 p-5">
            <p className="inline-flex items-center gap-2 text-label text-fg-subtle"><Megaphone className="size-3.5" /> Announcements</p>
            {announcements.length ? (
              announcements.map((a) => (
                <div key={a.id} className="flex flex-col gap-1 border-t border-border pt-3 first:border-0 first:pt-0">
                  <p className="font-medium">{a.title}</p>
                  <div className="prose-globify text-body-sm" dangerouslySetInnerHTML={{ __html: a.body }} />
                  <p className="text-caption text-fg-subtle">{a.author.name} · {a.course?.title ?? a.batch?.code ?? "Everyone"} · {relativeTime(a.publishedAt)}</p>
                </div>
              ))
            ) : (
              <p className="text-caption text-fg-muted">No announcements.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
