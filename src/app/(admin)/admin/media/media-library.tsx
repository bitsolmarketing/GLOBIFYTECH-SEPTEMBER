"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, FolderPlus, Trash2, FileText, Film, Music, File as FileIcon, ImageIcon } from "lucide-react";
import { deleteMediaAction, updateMediaAction, createMediaFolderAction } from "@/server/actions/admin";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { FileUploader } from "@/components/ui/file-uploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { SimpleSelect } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toaster";
import { cn, formatDate } from "@/lib/utils";

interface MediaItem { id: string; url: string; kind: string; mime: string; size: number; fileName: string; alt: string; caption: string; tags: string[]; folderId: string | null; usageCount: number; uploadedBy: string | null; createdAt: string }

function kindIcon(kind: string) {
  if (kind === "IMAGE") return <ImageIcon className="size-6" />;
  if (kind === "VIDEO") return <Film className="size-6" />;
  if (kind === "AUDIO") return <Music className="size-6" />;
  if (kind === "DOCUMENT") return <FileText className="size-6" />;
  return <FileIcon className="size-6" />;
}
const sizeLabel = (bytes: number) => (bytes > 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

export function MediaLibrary({ items, folders, activeFolder }: { items: MediaItem[]; folders: Array<{ id: string; name: string; count: number }>; activeFolder: string | null }) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<MediaItem | null>(null);
  const [folderName, setFolderName] = React.useState("");
  const [creatingFolder, setCreatingFolder] = React.useState(false);
  const [tagDraft, setTagDraft] = React.useState("");
  const [pending, start] = React.useTransition();
  const copyId = (id: string) => { navigator.clipboard?.writeText(id).then(() => toast.success("Media id copied.")).catch(() => toast.error("Could not copy.")); };
  return (
    <div className="flex flex-col gap-6">
      <div className="surface p-5">
        <p className="text-h4 mb-3">Upload</p>
        <FileUploader multiple kind="any" maxSizeMb={100} folder={activeFolder ?? undefined} onChange={() => router.refresh()} hint="Images, video, audio and documents. Files are stored with the configured driver." />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link href="/admin/media" className={cn("rounded-md border px-3 py-1.5 text-sm", !activeFolder ? "border-accent bg-accent-soft text-accent" : "border-border hover:bg-bg-subtle")}>All files</Link>
        {folders.map((f) => <Link key={f.id} href={`/admin/media?folder=${f.id}`} className={cn("rounded-md border px-3 py-1.5 text-sm", activeFolder === f.id ? "border-accent bg-accent-soft text-accent" : "border-border hover:bg-bg-subtle")}>{f.name} <span className="text-caption text-fg-subtle">{f.count}</span></Link>)}
        <Button size="sm" variant="ghost" onClick={() => setCreatingFolder(true)}><FolderPlus /> New folder</Button>
      </div>

      {items.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((m) => (
            <button key={m.id} type="button" onClick={() => { setSelected(m); setTagDraft(""); }} className="surface surface-hover overflow-hidden text-start">
              <div className="flex aspect-video items-center justify-center bg-bg-muted text-fg-subtle">
                {m.kind === "IMAGE" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt={m.alt || m.fileName} className="size-full object-cover" loading="lazy" />
                ) : kindIcon(m.kind)}
              </div>
              <div className="p-2">
                <p className="truncate text-caption font-medium">{m.fileName}</p>
                <p className="text-caption text-fg-subtle">{sizeLabel(m.size)}{m.usageCount ? ` · used ${m.usageCount}×` : ""}</p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState icon={<ImageIcon />} title="No files here." description="Upload images for course covers, page sections and blog posts." />
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{selected?.fileName}</DialogTitle><DialogDescription>{selected ? `${selected.mime} · ${sizeLabel(selected.size)} · uploaded ${formatDate(new Date(selected.createdAt))}${selected.uploadedBy ? ` by ${selected.uploadedBy}` : ""}` : ""}</DialogDescription></DialogHeader>
          {selected ? (
            <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-bg-muted text-fg-subtle">
                {selected.kind === "IMAGE" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selected.url} alt={selected.alt || selected.fileName} className="size-full object-contain" />
                ) : kindIcon(selected.kind)}
              </div>
              <div className="grid gap-3">
                <div className="flex items-center gap-2"><code className="flex-1 truncate rounded bg-bg-muted px-2 py-1 text-caption">{selected.id}</code><Button size="sm" variant="ghost" aria-label="Copy id" onClick={() => copyId(selected.id)}><Copy /></Button></div>
                <Field label="Alt text" htmlFor="m-alt" hint="Describe the image for screen readers."><Input id="m-alt" value={selected.alt} onChange={(e) => setSelected({ ...selected, alt: e.target.value })} /></Field>
                <Field label="Caption" htmlFor="m-cap"><Textarea id="m-cap" rows={2} value={selected.caption} onChange={(e) => setSelected({ ...selected, caption: e.target.value })} /></Field>
                <div className="grid gap-1.5">
                  <span className="text-label">Tags</span>
                  <div className="flex flex-wrap gap-1">{selected.tags.map((t) => <Badge key={t} variant="accent">{t}<button type="button" aria-label={`Remove ${t}`} onClick={() => setSelected({ ...selected, tags: selected.tags.filter((x) => x !== t) })}>×</button></Badge>)}</div>
                  <Input value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && tagDraft.trim()) { e.preventDefault(); setSelected({ ...selected, tags: [...new Set([...selected.tags, tagDraft.trim()])] }); setTagDraft(""); } }} placeholder="Add a tag and press Enter" />
                </div>
                {folders.length ? <Field label="Folder" htmlFor="m-folder"><SimpleSelect value={selected.folderId ?? "none"} onValueChange={(v) => setSelected({ ...selected, folderId: v === "none" ? null : v })} options={[{ value: "none", label: "No folder" }, ...folders.map((f) => ({ value: f.id, label: f.name }))]} /></Field> : null}
                <a href={selected.url} target="_blank" rel="noreferrer" className="text-caption text-accent hover:underline">Open original</a>
              </div>
            </div>
          ) : null}
          <DialogFooter className="justify-between">
            {selected ? <ConfirmAction title={`Delete ${selected.fileName}?`} description={selected.usageCount ? `This file is used ${selected.usageCount} time(s). Deleting it will break those references.` : "The file is removed from the library."} confirmLabel="Delete" variant="danger" action={() => deleteMediaAction(selected.id)} successMessage="File deleted." onDone={() => setSelected(null)}><Trash2 /> Delete</ConfirmAction> : null}
            <span className="flex gap-2">
              <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
              <Button loading={pending} onClick={() => start(async () => { if (!selected) return; const res = await updateMediaAction(selected.id, { alt: selected.alt, caption: selected.caption, tags: selected.tags, folderId: selected.folderId }); if (!res.ok) { toast.error(res.error.message); return; } toast.success("Details saved."); setSelected(null); router.refresh(); })}>Save details</Button>
            </span>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={creatingFolder} onOpenChange={setCreatingFolder}>
        <DialogContent>
          <DialogHeader><DialogTitle>New folder</DialogTitle></DialogHeader>
          <Input value={folderName} onChange={(e) => setFolderName(e.target.value)} placeholder="Course covers" autoFocus />
          <DialogFooter><Button variant="ghost" onClick={() => setCreatingFolder(false)}>Cancel</Button><Button loading={pending} disabled={!folderName.trim()} onClick={() => start(async () => { const res = await createMediaFolderAction(folderName.trim(), activeFolder); if (!res.ok) { toast.error(res.error.message); return; } toast.success("Folder created."); setFolderName(""); setCreatingFolder(false); router.refresh(); })}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
