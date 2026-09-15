"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, MessageSquare, Sparkles } from "lucide-react";
import { cn, relativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SimpleSelect } from "@/components/ui/select";
import { AiChat, type ChatMessage } from "./ai-chat";
import { PageHeader } from "@/components/layout/page-header";

export function AiTutorPage({ enabled, conversations, courses, activeId, initialMessages }: { enabled: boolean; conversations: Array<{ id: string; title: string; updatedAt: string; courseId: string | null }>; courses: Array<{ id: string; title: string }>; activeId: string | null; initialMessages: ChatMessage[] }) {
  const router = useRouter();
  const [courseId, setCourseId] = React.useState<string>(conversations.find((c) => c.id === activeId)?.courseId ?? courses[0]?.id ?? "");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Globify AI" description="Your tutor for every enrolled course. It reads your lessons and your progress." eyebrow="AI tutor" />
      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="surface flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-border p-3">
            <p className="text-label text-fg-subtle">Conversations</p>
            <Button size="sm" variant="ghost" onClick={() => router.push("/student/ai")}>
              <Plus /> New
            </Button>
          </div>
          <ul className="max-h-[60vh] overflow-y-auto scrollbar-thin">
            {conversations.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => router.push(`/student/ai?c=${c.id}`)} className={cn("flex w-full items-start gap-2 px-3 py-2.5 text-start text-sm transition-colors hover:bg-bg-muted", c.id === activeId && "bg-accent-soft text-accent")}>
                  <MessageSquare className="mt-0.5 size-4 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{c.title}</span>
                    <span className="block text-caption text-fg-subtle">{relativeTime(c.updatedAt)}</span>
                  </span>
                </button>
              </li>
            ))}
            {!conversations.length ? <li className="p-4 text-caption text-fg-muted">No conversations yet.</li> : null}
          </ul>
        </aside>
        <section className="surface flex h-[70vh] min-h-[520px] flex-col overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
            <Sparkles className="size-4 text-accent" />
            <p className="text-sm font-medium">Context</p>
            <div className="ms-auto w-64">
              <SimpleSelect value={courseId} onValueChange={setCourseId} options={[{ value: "", label: "General (no course)" }, ...courses.map((c) => ({ value: c.id, label: c.title }))]} size="sm" placeholder="Course" />
            </div>
          </div>
          <AiChat key={activeId ?? "new"} endpoint="/api/v1/ai/tutor" context={{ courseId: courseId || null }} enabled={enabled} conversationId={activeId} initialMessages={initialMessages} onConversation={(id) => router.replace(`/student/ai?c=${id}`)} suggestions={["What should I learn next?", "Where am I weak?", "Summarise my current course", "Quiz me on the last lesson"]} />
        </section>
      </div>
    </div>
  );
}
