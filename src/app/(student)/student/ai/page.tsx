import type { Metadata } from "next";
import { requireUser } from "@/server/auth/session";
import { listTutorConversations, getConversationMessages } from "@/server/ai/tutor";
import { isAiConfigured } from "@/server/ai/provider";
import { prisma } from "@/server/db/prisma";
import { AiTutorPage } from "@/components/lms/ai-tutor-page";

export const metadata: Metadata = { title: "Globify AI" };
export const dynamic = "force-dynamic";

export default async function StudentAiPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const [{ c }, user] = await Promise.all([searchParams, requireUser()]);
  const [conversations, courses] = await Promise.all([
    listTutorConversations(user.id),
    prisma.enrollment.findMany({ where: { student: { userId: user.id }, status: "ACTIVE" }, select: { course: { select: { id: true, title: true } } } }),
  ]);
  const messages = c ? await getConversationMessages(c, user.id).catch(() => []) : [];
  return (
    <AiTutorPage
      enabled={isAiConfigured()}
      conversations={conversations.map((x) => ({ id: x.id, title: x.title ?? "Conversation", updatedAt: x.updatedAt.toISOString(), courseId: x.courseId }))}
      courses={courses.map((e) => e.course)}
      activeId={c ?? null}
      initialMessages={messages.filter((m) => m.role === "USER" || m.role === "ASSISTANT").map((m) => ({ id: m.id, role: m.role === "USER" ? ("user" as const) : ("assistant" as const), content: m.content }))}
    />
  );
}
