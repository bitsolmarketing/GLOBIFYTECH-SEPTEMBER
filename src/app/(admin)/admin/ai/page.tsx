import type { Metadata } from "next";
import { Sparkles, ShieldCheck } from "lucide-react";
import { requirePermission } from "@/server/auth/session";
import { isAiConfigured } from "@/server/ai/provider";
import { getSetting } from "@/server/services/settings";
import { prisma } from "@/server/db/prisma";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/layout/page-header";
import { AiChat } from "@/components/lms/ai-chat";
import { Badge } from "@/components/ui/badge";
import { AssistantConversations } from "./conversations";

export const metadata: Metadata = { title: "Admin assistant" };
export const dynamic = "force-dynamic";

export default async function AdminAiPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const [{ c }, user] = await Promise.all([searchParams, requirePermission("ai.admin_assistant")]);
  const [enabledSetting, conversations] = await Promise.all([
    getSetting("ai.adminAssistantEnabled"),
    prisma.aIConversation.findMany({ where: { userId: user.id, contextType: "ADMIN_ASSISTANT" }, orderBy: { updatedAt: "desc" }, take: 30, select: { id: true, title: true, updatedAt: true } }),
  ]);
  const active = c ? await prisma.aIConversation.findFirst({ where: { id: c, userId: user.id }, select: { messages: { orderBy: { createdAt: "asc" }, select: { id: true, role: true, content: true } } } }) : null;
  const enabled = isAiConfigured() && !!enabledSetting;
  const scopes = [
    can(user, "students.read") && "Students",
    can(user, "enrollments.read") && "Enrollments",
    can(user, "payments.read") && "Finance",
    can(user, "crm.leads.read") && "Leads",
    can(user, "applications.read") && "Applications",
    can(user, "analytics.read") && "Analytics",
    can(user, "batches.read") && "Batches & attendance",
  ].filter(Boolean) as string[];
  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Globify AI" title="Admin assistant" description="Ask questions about the institute in plain language. The assistant can only read what your role can read." actions={<Badge variant="accent"><ShieldCheck className="size-3.5" /> Permission-aware</Badge>} />
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <AssistantConversations items={conversations.map((x) => ({ id: x.id, title: x.title ?? "Conversation", updatedAt: x.updatedAt.toISOString() }))} activeId={c ?? null} scopes={scopes} />
        <div className="surface flex min-h-[70vh] flex-col overflow-hidden">
          <AiChat
            key={c ?? "new"}
            endpoint="/api/v1/ai/admin"
            enabled={enabled}
            conversationId={c ?? null}
            initialMessages={(active?.messages ?? []).filter((m) => m.role === "USER" || m.role === "ASSISTANT").map((m) => ({ id: m.id, role: m.role === "USER" ? ("user" as const) : ("assistant" as const), content: m.content }))}
            suggestions={["Which students have been inactive for more than 7 days?", "How much revenue did we collect this month?", "Show me leads with overdue follow-ups", "Which batches have attendance below 75%?", "Summarise pending applications"]}
            placeholder="Ask about students, revenue, leads, attendance…"
            disabledMessage={!isAiConfigured() ? "Add an AI provider key in the environment to enable the assistant." : "The admin assistant is switched off in Settings."}
          />
        </div>
      </div>
      <p className="flex items-center gap-2 text-caption text-fg-subtle"><Sparkles className="size-3.5" /> Answers are generated from live database queries scoped to your permissions and logged as AI generations. Verify before acting on financial figures.</p>
    </div>
  );
}
