"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Plus, Pencil, Trash2, Eye, EyeOff, Copy } from "lucide-react";
import { updatePortfolioAction, upsertPortfolioProjectAction, deletePortfolioProjectAction } from "@/server/actions/student";
import { Button, IconButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileUploader, type UploadedFile } from "@/components/ui/file-uploader";
import { CourseArtwork } from "@/components/marketing/course-artwork";
import { toast } from "@/components/ui/toaster";

interface Project {
  id: string;
  title: string;
  description: string;
  coverMediaId: string | null;
  coverUrl: string | null;
  repoUrl: string;
  liveUrl: string;
  skills: string[];
  isVisible: boolean;
}

export function PortfolioEditor({ portfolio, publicUrl, projects }: { portfolio: { username: string; headline: string; about: string; isPublic: boolean; showCertificates: boolean; showSkills: boolean }; publicUrl: string; projects: Project[] }) {
  const router = useRouter();
  const [form, setForm] = React.useState(portfolio);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const [pending, start] = React.useTransition();
  const [editing, setEditing] = React.useState<Partial<Project> | null>(null);
  const [cover, setCover] = React.useState<UploadedFile[]>([]);

  const save = () =>
    start(async () => {
      setErrors({});
      const res = await updatePortfolioAction(form);
      if (!res.ok) {
        setErrors(res.error.fields ?? {});
        { toast.error(res.error.message); return; }
      }
      toast.success("Portfolio saved.");
      router.refresh();
    });

  const saveProject = () => {
    if (!editing) return;
    start(async () => {
      const res = await upsertPortfolioProjectAction({ id: editing.id, title: editing.title ?? "", description: editing.description ?? "", coverMediaId: cover[0]?.mediaId ?? editing.coverMediaId ?? null, repoUrl: editing.repoUrl ?? "", liveUrl: editing.liveUrl ?? "", skills: editing.skills ?? [], isVisible: editing.isVisible ?? true });
      if (!res.ok) { toast.error(res.error.message); return; }
      toast.success("Project saved.");
      setEditing(null);
      setCover([]);
      router.refresh();
    });
  };

  const remove = (id: string) => {
    if (!window.confirm("Remove this project from your portfolio?")) return;
    start(async () => {
      const res = await deletePortfolioProjectAction(id);
      if (!res.ok) { toast.error(res.error.message); return; }
      router.refresh();
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <section className="surface flex flex-col gap-4 p-6 lg:col-span-5">
        <div className="flex items-center justify-between">
          <h2 className="text-h4">Public page</h2>
          <Badge variant={form.isPublic ? "success" : "default"}>{form.isPublic ? "Public" : "Private"}</Badge>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-border bg-bg-subtle px-3 py-2 text-caption">
          <span className="truncate text-fg-muted">{publicUrl}</span>
          <IconButton label="Copy link" size="sm" className="ms-auto" onClick={() => { void navigator.clipboard.writeText(publicUrl); toast.success("Link copied."); }}><Copy /></IconButton>
          <Button asChild size="sm" variant="ghost"><Link href={`/portfolio/${portfolio.username}`} target="_blank"><ExternalLink /></Link></Button>
        </div>
        <Field label="Username" htmlFor="pf-username" error={errors.username} hint="Lowercase letters, numbers and hyphens">
          <Input id="pf-username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })} />
        </Field>
        <Field label="Headline" htmlFor="pf-headline" error={errors.headline}>
          <Input id="pf-headline" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} placeholder="Performance marketer · Faisalabad" />
        </Field>
        <Field label="About" htmlFor="pf-about" error={errors.about}>
          <Textarea id="pf-about" rows={5} value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} />
        </Field>
        <div className="flex flex-col gap-3">
          {([["isPublic", "Make portfolio public"], ["showCertificates", "Show certificates"], ["showSkills", "Show skills"]] as const).map(([k, label]) => (
            <div key={k} className="flex items-center justify-between">
              <Label htmlFor={`pf-${k}`}>{label}</Label>
              <Switch id={`pf-${k}`} checked={form[k]} onCheckedChange={(v) => setForm({ ...form, [k]: v })} />
            </div>
          ))}
        </div>
        <Button onClick={save} loading={pending}>Save</Button>
      </section>

      <section className="flex flex-col gap-4 lg:col-span-7">
        <div className="flex items-center justify-between">
          <h2 className="text-h4">Projects ({projects.length})</h2>
          <Button size="sm" onClick={() => { setEditing({ title: "", description: "", repoUrl: "", liveUrl: "", skills: [], isVisible: true }); setCover([]); }}><Plus /> Add project</Button>
        </div>
        {projects.length ? (
          <ul className="grid gap-4 sm:grid-cols-2">
            {projects.map((p) => (
              <li key={p.id} className="surface flex flex-col overflow-hidden">
                <div className="aspect-[16/9] bg-bg-muted"><CourseArtwork artworkKey="development" seed={p.id} title={p.title} imageUrl={p.coverUrl} /></div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{p.title}</p>
                    {p.isVisible ? <Eye className="size-4 text-fg-subtle" /> : <EyeOff className="size-4 text-fg-subtle" />}
                  </div>
                  <p className="text-caption line-clamp-2 text-fg-muted">{p.description}</p>
                  <div className="mt-auto flex items-center gap-1 pt-2">
                    <IconButton label="Edit" size="sm" onClick={() => { setEditing(p); setCover([]); }}><Pencil /></IconButton>
                    <IconButton label="Delete" size="sm" onClick={() => remove(p.id)}><Trash2 /></IconButton>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body-sm text-fg-muted">No projects yet. Approved course projects appear here automatically.</p>
        )}
      </section>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent size="lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit project" : "Add project"}</DialogTitle></DialogHeader>
          {editing ? (
            <div className="grid gap-4">
              <Field label="Title" htmlFor="pp-title"><Input id="pp-title" value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></Field>
              <Field label="Description" htmlFor="pp-desc"><Textarea id="pp-desc" rows={4} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Repository URL" htmlFor="pp-repo"><Input id="pp-repo" type="url" value={editing.repoUrl ?? ""} onChange={(e) => setEditing({ ...editing, repoUrl: e.target.value })} /></Field>
                <Field label="Live URL" htmlFor="pp-live"><Input id="pp-live" type="url" value={editing.liveUrl ?? ""} onChange={(e) => setEditing({ ...editing, liveUrl: e.target.value })} /></Field>
              </div>
              <Field label="Skills (comma separated)" htmlFor="pp-skills"><Input id="pp-skills" value={(editing.skills ?? []).join(", ")} onChange={(e) => setEditing({ ...editing, skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} /></Field>
              <div><p className="mb-2 text-sm font-medium">Cover image</p><FileUploader kind="image" accept="image/*" maxSizeMb={10} folder="portfolio" value={cover} onChange={setCover} /></div>
              <div className="flex items-center justify-between"><Label htmlFor="pp-visible">Visible on public page</Label><Switch id="pp-visible" checked={editing.isVisible ?? true} onCheckedChange={(v) => setEditing({ ...editing, isVisible: v })} /></div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveProject} loading={pending}>Save project</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
