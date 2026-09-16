"use client";

import * as React from "react";
import { Send, Sparkles, Square, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, IconButton } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface AiChatProps {
  endpoint: string;
  context?: Record<string, string | null | undefined>;
  enabled: boolean;
  suggestions?: string[];
  initialMessages?: ChatMessage[];
  conversationId?: string | null;
  onConversation?: (id: string) => void;
  compact?: boolean;
  placeholder?: string;
  disabledMessage?: string;
}

/**
 * Streaming chat client. Posts { message, context, conversationId } and reads a
 * text/plain stream; the conversation id arrives in the `x-conversation-id` header.
 */
export function AiChat({ endpoint, context, enabled, suggestions = [], initialMessages = [], conversationId: initialConversation = null, onConversation, compact, placeholder = "Ask Globify AI…", disabledMessage }: AiChatProps) {
  const [messages, setMessages] = React.useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = React.useState("");
  const [streaming, setStreaming] = React.useState(false);
  const [conversationId, setConversationId] = React.useState<string | null>(initialConversation);
  const abortRef = React.useRef<AbortController | null>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);



  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || streaming || !enabled) return;
    setInput("");
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: message };
    const assistantId = crypto.randomUUID();
    setMessages((m) => [...m, userMsg, { id: assistantId, role: "assistant", content: "" }]);
    setStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, context, conversationId }), signal: controller.signal });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? "Globify AI is unavailable right now.");
      }
      const cid = res.headers.get("x-conversation-id");
      if (cid && cid !== conversationId) {
        setConversationId(cid);
        onConversation?.(cid);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => m.map((x) => (x.id === assistantId ? { ...x, content: acc } : x)));
      }
    } catch (error) {
      const msg = (error as Error).name === "AbortError" ? "Stopped." : (error as Error).message;
      setMessages((m) => m.map((x) => (x.id === assistantId ? { ...x, content: x.content || msg } : x)));
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const stop = () => abortRef.current?.abort();

  if (!enabled) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <Sparkles className="size-6 text-fg-subtle" />
        <p className="text-sm font-medium">Globify AI isn’t switched on yet.</p>
        <p className="text-caption text-fg-muted">{disabledMessage ?? "An administrator needs to add an AI provider key. Everything else works without it."}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <div className={cn("flex flex-col gap-4", compact ? "p-4" : "p-6")}>
          {!messages.length ? (
            <div className="flex flex-col gap-3">
              <p className="text-body-sm text-fg-muted">I can explain, give examples, quiz you, or tell you what to learn next. I won’t do graded work for you — but I’ll help you get unstuck.</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button key={s} type="button" onClick={() => void send(s)} className="rounded-full border border-border bg-surface px-3 py-1.5 text-caption text-fg-muted transition-colors hover:border-accent hover:text-accent">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {messages.map((m) => (
            <div key={m.id} className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}>
              <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full", m.role === "user" ? "bg-bg-muted text-fg-muted" : "gradient-brand text-white")}>
                {m.role === "user" ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
              </span>
              <div className={cn("max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed", m.role === "user" ? "rounded-tr-sm bg-accent text-white" : "rounded-tl-sm bg-bg-muted text-fg")}>
                {m.content || <span className="inline-flex gap-1 py-1"><span className="size-1.5 animate-bounce rounded-full bg-fg-subtle [animation-delay:-0.2s]" /><span className="size-1.5 animate-bounce rounded-full bg-fg-subtle [animation-delay:-0.1s]" /><span className="size-1.5 animate-bounce rounded-full bg-fg-subtle" /></span>}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className={cn("flex items-end gap-2 border-t border-border", compact ? "p-3" : "p-4")}
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          placeholder={placeholder}
          rows={compact ? 1 : 2}
          className="min-h-10 resize-none"
          aria-label="Message Globify AI"
        />
        {streaming ? (
          <IconButton label="Stop" variant="secondary" onClick={stop} type="button">
            <Square />
          </IconButton>
        ) : (
          <Button type="submit" size="icon" disabled={!input.trim()} aria-label="Send">
            <Send />
          </Button>
        )}
      </form>
    </div>
  );
}
