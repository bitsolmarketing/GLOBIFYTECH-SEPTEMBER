"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Send, Plus, MessageCircle } from "lucide-react";
import { sendMessageAction, startConversationAction } from "@/server/actions/student";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/form";
import { Combobox } from "@/components/ui/combobox";
import { Avatar } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toaster";
import { cn, relativeTime } from "@/lib/utils";

export interface ConversationRow {
  id: string;
  title: string | null;
  isGroup: boolean;
  unread: number;
  others: Array<{ id: string; name: string; avatar?: { url: string } | null }>;
  last: { body: string; createdAt: string; senderId: string } | null;
}

export function ConversationList({ conversations, basePath, activeId, contacts, userId }: { conversations: ConversationRow[]; basePath: string; activeId?: string | null; contacts: Array<{ id: string; name: string; role: string }>; userId: string }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border p-3">
        <p className="text-label text-fg-subtle">Messages</p>
        <NewConversation contacts={contacts} basePath={basePath} />
      </div>
      {conversations.length ? (
        <ul className="flex-1 overflow-y-auto scrollbar-thin">
          {conversations.map((c) => {
            const name = c.title ?? c.others.map((o) => o.name).join(", ") ?? "Conversation";
            const other = c.others[0];
            return (
              <li key={c.id}>
                <Link href={`${basePath}/${c.id}`} className={cn("flex items-center gap-3 px-3 py-3 transition-colors hover:bg-bg-muted", c.id === activeId && "bg-accent-soft/50")}>
                  <Avatar name={name} src={c.isGroup ? null : other?.avatar?.url} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn("truncate text-sm", c.unread ? "font-semibold" : "font-medium")}>{name}</p>
                      {c.last ? <span className="shrink-0 text-caption text-fg-subtle">{relativeTime(c.last.createdAt)}</span> : null}
                    </div>
                    <p className="truncate text-caption text-fg-muted">{c.last ? `${c.last.senderId === userId ? "You: " : ""}${c.last.body}` : "No messages yet"}</p>
                  </div>
                  {c.unread ? <span className="rounded-full bg-accent px-1.5 text-[10px] font-semibold leading-4 text-white">{c.unread}</span> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState compact icon={<MessageCircle />} title="No conversations yet." className="m-3" />
      )}
    </div>
  );
}

export function NewConversation({ contacts, basePath }: { contacts: Array<{ id: string; name: string; role: string }>; basePath: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [to, setTo] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [pending, start] = React.useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost"><Plus /> New</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New message</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <Field label="To" htmlFor="nm-to"><Combobox options={contacts.map((c) => ({ value: c.id, label: c.name, description: c.role }))} value={to} onChange={setTo} placeholder="Choose a person" searchPlaceholder="Search people…" /></Field>
          <Field label="Subject (optional)" htmlFor="nm-title"><Input id="nm-title" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="Message" htmlFor="nm-body"><Textarea id="nm-body" rows={4} value={body} onChange={(e) => setBody(e.target.value)} /></Field>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          <Button loading={pending} disabled={!to || !body.trim()} onClick={() => start(async () => { const res = await startConversationAction({ participantIds: [to!], title, body }); if (!res.ok) { toast.error(res.error.message); return; } setOpen(false); router.push(`${basePath}/${res.data.id}`); router.refresh(); })}>Send</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MessageThread({ conversationId, messages, userId }: { conversationId: string; messages: Array<{ id: string; body: string; createdAt: string; sender: { id: string; name: string; avatar?: { url: string } | null }; attachment?: { url: string; fileName: string } | null }>; userId: string }) {
  const router = useRouter();
  const [body, setBody] = React.useState("");
  const [pending, start] = React.useTransition();
  const bottom = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => bottom.current?.scrollIntoView({ block: "end" }), [messages.length]);
  React.useEffect(() => {
    const t = setInterval(() => router.refresh(), 15000);
    return () => clearInterval(t);
  }, [router]);
  const send = () =>
    start(async () => {
      const res = await sendMessageAction({ conversationId, body });
      if (!res.ok) { toast.error(res.error.message); return; }
      setBody("");
      router.refresh();
    });
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        <ul className="flex flex-col gap-3">
          {messages.map((m) => {
            const mine = m.sender.id === userId;
            return (
              <li key={m.id} className={cn("flex gap-2", mine && "flex-row-reverse")}>
                {!mine ? <Avatar name={m.sender.name} src={m.sender.avatar?.url} size="xs" className="mt-1" /> : null}
                <div className={cn("max-w-[78%] rounded-2xl px-3.5 py-2 text-sm", mine ? "rounded-tr-sm bg-accent text-white" : "rounded-tl-sm bg-bg-muted")}>
                  {!mine ? <p className="mb-0.5 text-caption font-medium opacity-80">{m.sender.name}</p> : null}
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  {m.attachment ? <a href={m.attachment.url} target="_blank" rel="noreferrer" className="mt-1 block underline">{m.attachment.fileName}</a> : null}
                  <p className={cn("mt-1 text-[10px]", mine ? "text-white/70" : "text-fg-subtle")}>{relativeTime(m.createdAt)}</p>
                </div>
              </li>
            );
          })}
        </ul>
        <div ref={bottom} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-end gap-2 border-t border-border p-3">
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Write a message…" rows={1} className="min-h-10" aria-label="Message" />
        <Button type="submit" size="icon" loading={pending} disabled={!body.trim()} aria-label="Send"><Send /></Button>
      </form>
    </div>
  );
}
