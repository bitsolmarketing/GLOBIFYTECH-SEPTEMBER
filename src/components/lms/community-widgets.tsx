"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ThumbsUp, Flag, MessageSquarePlus, Send } from "lucide-react";
import { createDiscussionAction, replyAction, reactAction, reportAction } from "@/server/actions/student";
import { Button, IconButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { SimpleSelect } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

export function NewDiscussionButton({ scopes, defaultOpen, defaultScope, basePath = "/student/community" }: { scopes: Array<{ value: string; label: string; courseId?: string | null; batchId?: string | null; lessonId?: string | null }>; defaultOpen?: boolean; defaultScope?: string; basePath?: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(!!defaultOpen);
  const [scope, setScope] = React.useState(defaultScope ?? scopes[0]?.value ?? "");
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [isQuestion, setIsQuestion] = React.useState(true);
  const [pending, start] = React.useTransition();
  const submit = () =>
    start(async () => {
      const s = scopes.find((x) => x.value === scope);
      const res = await createDiscussionAction({ title, body, isQuestion, courseId: s?.courseId ?? null, batchId: s?.batchId ?? null, lessonId: s?.lessonId ?? null, groupId: null });
      if (!res.ok) { toast.error(res.error.message); return; }
      setOpen(false);
      setTitle("");
      setBody("");
      router.push(`${basePath}/${res.data.id}`);
    });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><MessageSquarePlus /> New post</Button>
      </DialogTrigger>
      <DialogContent size="lg">
        <DialogHeader><DialogTitle>Start a discussion</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <Field label="Where" htmlFor="d-scope"><SimpleSelect value={scope} onValueChange={setScope} options={scopes} placeholder="Choose a course or batch" /></Field>
          <Field label="Title" htmlFor="d-title"><Input id="d-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's your question or topic?" /></Field>
          <Field label="Details" htmlFor="d-body"><Textarea id="d-body" rows={6} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add context, what you tried, screenshots links…" /></Field>
          <label className="flex items-center gap-2 text-body-sm"><Checkbox checked={isQuestion} onCheckedChange={(v) => setIsQuestion(!!v)} /> This is a question (can be marked as resolved)</label>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} loading={pending} disabled={!title.trim() || !body.trim() || !scope}>Post</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ReplyBox({ discussionId, parentId, placeholder = "Write a reply…" }: { discussionId: string; parentId?: string | null; placeholder?: string }) {
  const router = useRouter();
  const [body, setBody] = React.useState("");
  const [pending, start] = React.useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await replyAction({ discussionId, parentId: parentId ?? null, body });
          if (!res.ok) { toast.error(res.error.message); return; }
          setBody("");
          router.refresh();
        });
      }}
      className="flex items-end gap-2"
    >
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={placeholder} rows={2} className="min-h-10" />
      <Button type="submit" size="icon" loading={pending} disabled={!body.trim()} aria-label="Send reply"><Send /></Button>
    </form>
  );
}

export function ReactButton({ discussionId, replyId, count, reacted }: { discussionId?: string; replyId?: string; count: number; reacted: boolean }) {
  const router = useRouter();
  const [state, setState] = React.useState({ count, reacted });
  const [pending, start] = React.useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await reactAction({ discussionId: discussionId ?? null, replyId: replyId ?? null, emoji: "👍" });
          if (!res.ok) { toast.error(res.error.message); return; }
          setState((s) => ({ reacted: res.data.reacted, count: s.count + (res.data.reacted ? 1 : -1) }));
          router.refresh();
        })
      }
      className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-caption transition-colors", state.reacted ? "border-accent bg-accent-soft text-accent" : "border-border text-fg-muted hover:border-border-strong")}
      aria-pressed={state.reacted}
    >
      <ThumbsUp className="size-3.5" /> {state.count}
    </button>
  );
}

export function ReportButton({ discussionId, replyId }: { discussionId?: string; replyId?: string }) {
  const [pending, start] = React.useTransition();
  return (
    <IconButton
      label="Report"
      size="sm"
      disabled={pending}
      onClick={() => {
        const reason = window.prompt("Why are you reporting this?");
        if (!reason) return;
        start(async () => {
          const res = await reportAction({ discussionId: discussionId ?? null, replyId: replyId ?? null, reason });
          if (res.ok) toast.success("Thanks — a moderator will review it.");
          else toast.error(res.error.message);
        });
      }}
    >
      <Flag />
    </IconButton>
  );
}
