"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import type { ActionResult } from "@/server/errors";

/**
 * Button that opens a confirmation dialog, then runs a server action.
 * Pass `reason` to require a free-text justification (revokes, refunds...).
 */
export function ConfirmAction({ title, description, confirmLabel = "Confirm", reason, action, onDone, successMessage = "Done.", children, variant = "outline", size = "sm", disabled }: { title: string; description?: string; confirmLabel?: string; reason?: { label: string; required?: boolean }; action: (reason: string) => Promise<ActionResult<unknown>>; onDone?: () => void; successMessage?: string; children: React.ReactNode; variant?: ButtonProps["variant"]; size?: ButtonProps["size"]; disabled?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState("");
  const [pending, start] = React.useTransition();
  return (
    <>
      <Button type="button" variant={variant} size={size} onClick={() => setOpen(true)} disabled={disabled}>{children}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
          {reason ? (
            <div className="grid gap-1.5">
              <label htmlFor="confirm-reason" className="text-label">{reason.label}</label>
              <Textarea id="confirm-reason" rows={3} value={text} onChange={(e) => setText(e.target.value)} />
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              variant={variant === "danger" ? "danger" : "primary"}
              loading={pending}
              disabled={!!reason?.required && !text.trim()}
              onClick={() =>
                start(async () => {
                  const res = await action(text.trim());
                  if (!res.ok) { toast.error(res.error.message); return; }
                  toast.success(successMessage);
                  setOpen(false);
                  setText("");
                  onDone?.();
                  router.refresh();
                })
              }
            >
              {confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Small inline action button that runs a server action without confirmation. */
export function ActionButton({ action, children, successMessage = "Done.", variant = "outline", size = "sm", className, onDone }: { action: () => Promise<ActionResult<unknown>>; children: React.ReactNode; successMessage?: string; variant?: ButtonProps["variant"]; size?: ButtonProps["size"]; className?: string; onDone?: (data: unknown) => void }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  return (
    <Button type="button" variant={variant} size={size} className={className} loading={pending} onClick={() => start(async () => { const res = await action(); if (!res.ok) { toast.error(res.error.message); return; } toast.success(successMessage); onDone?.(res.data); router.refresh(); })}>
      {children}
    </Button>
  );
}
