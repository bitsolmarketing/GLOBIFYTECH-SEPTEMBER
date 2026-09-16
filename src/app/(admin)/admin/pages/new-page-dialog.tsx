"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { savePageAction } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { slugify } from "@/lib/utils";

export function NewPageDialog({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const [pending, start] = React.useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New page</DialogTitle><DialogDescription>Pages start as drafts. Add sections, then publish when ready.</DialogDescription></DialogHeader>
        <div className="grid gap-4">
          <Field label="Title" htmlFor="np-title" error={errors.title} required><Input id="np-title" value={title} onChange={(e) => { setTitle(e.target.value); setSlug(slugify(e.target.value)); }} autoFocus /></Field>
          <Field label="URL slug" htmlFor="np-slug" error={errors.slug} hint={slug === "home" ? "This page becomes the site home page." : `Will be published at /${slug || "…"}`}><Input id="np-slug" value={slug} onChange={(e) => setSlug(slugify(e.target.value))} /></Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button loading={pending} disabled={!title.trim()} onClick={() => start(async () => { setErrors({}); const res = await savePageAction({ title: title.trim(), slug: slug || undefined, locale: "en", noindex: false }); if (!res.ok) { setErrors(res.error.fields ?? {}); toast.error(res.error.message); return; } toast.success("Page created."); setOpen(false); router.push(`/admin/pages/${res.data.id}`); })}>Create page</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
