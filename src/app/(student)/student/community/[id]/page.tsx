import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, Lock, Pin } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { getDiscussion } from "@/server/services/community";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ReplyBox, ReactButton, ReportButton } from "@/components/lms/community-widgets";
import { relativeTime } from "@/lib/utils";
import { AppError } from "@/server/errors";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Discussion" };
export const dynamic = "force-dynamic";

export default async function DiscussionPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);
  const d = await getDiscussion(id).catch((e) => (e instanceof AppError ? null : Promise.reject(e)));
  if (!d) notFound();
  const base = user.roles.includes("STUDENT") || user.roles.includes("ALUMNI") ? "/student/community" : user.roles.includes("INSTRUCTOR") ? "/instructor/messages" : "/admin/messages";
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader breadcrumbs={[{ label: "Community", href: base }, { label: d.title }]} title={d.title} description={`${d.course?.title ?? d.batch?.code ?? "General"}${d.lesson ? ` · ${d.lesson.title}` : ""}`} actions={<>{d.isPinned ? <Badge variant="accent"><Pin className="size-3" /> Pinned</Badge> : null}{d.isResolved ? <Badge variant="success"><CheckCircle2 className="size-3" /> Resolved</Badge> : d.isQuestion ? <Badge variant="warning">Open question</Badge> : null}{d.isLocked ? <Badge><Lock className="size-3" /> Locked</Badge> : null}</>} />
      <article className="surface flex flex-col gap-4 p-5">
        <div className="flex items-center gap-3">
          <Avatar name={d.author.name} src={d.author.avatar?.url} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{d.author.name}</p>
            <p className="text-caption text-fg-subtle">{relativeTime(d.createdAt)}</p>
          </div>
          <ReactButton discussionId={d.id} count={d.reactions.length} reacted={d.reactions.some((r) => r.userId === user.id)} />
          <ReportButton discussionId={d.id} />
        </div>
        <div className="prose-globify" dangerouslySetInnerHTML={{ __html: d.body }} />
      </article>
      <section className="flex flex-col gap-3">
        <h2 className="text-label text-fg-subtle">{d.replies.length} replies</h2>
        {d.replies.map((r) => (
          <div key={r.id} className={cn("surface flex flex-col gap-3 p-4", r.isAccepted && "border-success/40", r.parentId && "ms-8")}>
            <div className="flex items-center gap-3">
              <Avatar name={r.author.name} src={r.author.avatar?.url} size="xs" />
              <p className="text-sm font-medium">{r.author.name}</p>
              <span className="text-caption text-fg-subtle">{relativeTime(r.createdAt)}</span>
              {r.isAccepted ? <Badge variant="success"><CheckCircle2 className="size-3" /> Accepted answer</Badge> : null}
              <div className="ms-auto flex items-center gap-1">
                <ReactButton replyId={r.id} count={r.reactions.length} reacted={r.reactions.some((x) => x.userId === user.id)} />
                <ReportButton replyId={r.id} />
              </div>
            </div>
            <div className="prose-globify text-sm" dangerouslySetInnerHTML={{ __html: r.body }} />
          </div>
        ))}
        {!d.isLocked ? (
          <div className="surface p-4">
            <ReplyBox discussionId={d.id} />
          </div>
        ) : (
          <p className="text-caption text-fg-muted">This discussion is locked.</p>
        )}
      </section>
    </div>
  );
}
