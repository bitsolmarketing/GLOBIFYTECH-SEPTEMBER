import { MessageCircle } from "lucide-react";
import { prisma } from "@/server/db/prisma";
import { listConversations, getConversation, startConversation } from "@/server/services/community";
import type { SessionUser } from "@/server/auth/session";
import { ConversationList, MessageThread } from "./messages-widgets";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { ROLE_LABELS, type RoleKey } from "@/lib/rbac";
import { redirect } from "next/navigation";

/**
 * Shared messages surface for student / instructor / admin. Contacts are
 * scoped: students see their instructors and batchmates' instructors plus
 * staff; staff see everyone relevant to them.
 */
async function contactsFor(user: SessionUser) {
  const isStudent = user.roles.includes("STUDENT") || user.roles.includes("ALUMNI");
  if (isStudent) {
    const student = await prisma.studentProfile.findUnique({ where: { userId: user.id }, select: { enrollments: { select: { course: { select: { instructors: { select: { instructor: { select: { user: { select: { id: true, name: true } } } } } } } } } }, batches: { select: { batch: { select: { instructor: { select: { user: { select: { id: true, name: true } } } } } } } } } });
    const instructors = new Map<string, string>();
    for (const e of student?.enrollments ?? []) for (const i of e.course.instructors) instructors.set(i.instructor.user.id, i.instructor.user.name);
    for (const b of student?.batches ?? []) if (b.batch.instructor) instructors.set(b.batch.instructor.user.id, b.batch.instructor.user.name);
    const staff = await prisma.user.findMany({ where: { status: "ACTIVE", roles: { some: { role: { key: { in: ["COUNSELLOR", "ADMISSIONS_MANAGER", "FINANCE_MANAGER", "CAREER_MANAGER"] } } } } }, select: { id: true, name: true, roles: { select: { role: { select: { key: true } } } } }, take: 30 });
    return [...[...instructors.entries()].map(([id, name]) => ({ id, name, role: "Instructor" })), ...staff.map((s) => ({ id: s.id, name: s.name, role: ROLE_LABELS[(s.roles[0]?.role.key as RoleKey) ?? "ADMIN"] }))];
  }
  const users = await prisma.user.findMany({ where: { status: "ACTIVE", NOT: { id: user.id } }, select: { id: true, name: true, roles: { select: { role: { select: { key: true } } } } }, orderBy: { name: "asc" }, take: 500 });
  return users.map((u) => ({ id: u.id, name: u.name, role: u.roles.map((r) => ROLE_LABELS[r.role.key as RoleKey]).join(", ") || "User" }));
}

export async function MessagesSurface({ user, basePath, activeId, to }: { user: SessionUser; basePath: string; activeId?: string | null; to?: string | null }) {
  if (to && !activeId) {
    const existing = await prisma.conversation.findFirst({ where: { isGroup: false, AND: [{ participants: { some: { userId: user.id } } }, { participants: { some: { userId: to } } }] } });
    if (existing) redirect(`${basePath}/${existing.id}`);
    const target = await prisma.user.findUnique({ where: { id: to }, select: { name: true } });
    if (target) {
      const c = await startConversation({ userId: user.id, participantIds: [to], body: `Hi ${target.name.split(" ")[0]},` });
      redirect(`${basePath}/${c.id}`);
    }
  }
  const [conversations, contacts, thread] = await Promise.all([listConversations(user.id), contactsFor(user), activeId ? getConversation(activeId, user.id).catch(() => null) : null]);
  const active = thread?.conversation;
  const others = active?.participants.filter((p) => p.userId !== user.id).map((p) => p.user) ?? [];
  return (
    <div className="surface grid h-[calc(100vh-140px)] min-h-[520px] overflow-hidden lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className={activeId ? "hidden border-e border-border lg:block" : "border-e border-border"}>
        <ConversationList conversations={conversations.map((c) => ({ id: c.id, title: c.title, isGroup: c.isGroup, unread: c.unread, others: c.others, last: c.last ? { body: c.last.body, createdAt: c.last.createdAt.toISOString(), senderId: c.last.senderId } : null }))} basePath={basePath} activeId={activeId} contacts={contacts} userId={user.id} />
      </div>
      <div className={activeId ? "flex min-h-0 flex-col" : "hidden lg:flex"}>
        {thread && active ? (
          <>
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Avatar name={others[0]?.name ?? active.title ?? "Group"} src={others[0]?.avatar?.url} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{active.title ?? others.map((o) => o.name).join(", ")}</p>
                <p className="text-caption text-fg-subtle">{active.participants.length} participants</p>
              </div>
            </div>
            <MessageThread conversationId={active.id} userId={user.id} messages={thread.messages.map((m) => ({ id: m.id, body: m.body, createdAt: m.createdAt.toISOString(), sender: m.sender, attachment: m.attachment ? { url: m.attachment.url, fileName: m.attachment.fileName } : null }))} />
          </>
        ) : (
          <EmptyState icon={<MessageCircle />} title="Pick a conversation" description="Or start a new one with an instructor or counsellor." className="m-6 flex-1" />
        )}
      </div>
    </div>
  );
}
