"use client";

import * as React from "react";
import { Eye } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

function Json({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <p className="text-caption text-fg-subtle">Nothing recorded.</p>;
  return <pre className="max-h-64 overflow-auto rounded-md bg-bg-muted p-3 text-caption leading-relaxed">{JSON.stringify(value, null, 2)}</pre>;
}

export function AuditDetails({ before, after, userAgent, roles }: { before: unknown; after: unknown; userAgent: string | null; roles: string[] }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} aria-label="View details"><Eye /></Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit entry</DialogTitle>
            <DialogDescription>Snapshot of the change as recorded at the time.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><p className="text-label mb-1 text-fg-subtle">Before</p><Json value={before} /></div>
            <div><p className="text-label mb-1 text-fg-subtle">After</p><Json value={after} /></div>
          </div>
          <div className="text-caption text-fg-muted">
            <p>Roles at the time: {roles.length ? roles.join(", ") : "—"}</p>
            {userAgent ? <p className="truncate">Client: {userAgent}</p> : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
