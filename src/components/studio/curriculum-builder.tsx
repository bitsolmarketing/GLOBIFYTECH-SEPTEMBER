"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, PlayCircle, FileText, Video, ListChecks, ClipboardList, FolderKanban, Paperclip, Eye, EyeOff, GripVertical } from "lucide-react";
import { createModuleAction, updateModuleAction, deleteModuleAction, createUnitAction, updateUnitAction, deleteUnitAction, saveLessonAction, deleteLessonAction, reorderAction } from "@/server/actions/instructor";
import { Button, IconButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/form";
import { SimpleSelect } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { FileUploader, type UploadedFile } from "@/components/ui/file-uploader";
import { Combobox } from "@/components/ui/combobox";
import { toast } from "@/components/ui/toaster";
import { cn, formatDuration } from "@/lib/utils";

export interface BuilderLesson {
  id: string;
  title: string;
  type: string;
  durationSeconds: number;
  isPreview: boolean;
  isPublished: boolean;
  content: string | null;
  videoUrl: string | null;
  video: UploadedFile | null;
  objectives: string[];
  quizId: string | null;
  assignmentId: string | null;
  projectId: string | null;
  resources: Array<{ title: string; type: string; url: string | null; mediaId: string | null }>;
}
export interface BuilderUnit { id: string; title: string; lessons: BuilderLesson[] }
export interface BuilderModule { id: string; title: string; description: string | null; isPublished: boolean; units: BuilderUnit[] }

export interface CurriculumBuilderProps {
  courseId: string;
  modules: BuilderModule[];
  quizzes: Array<{ id: string; title: string }>;
  assignments: Array<{ id: string; title: string }>;
  projects: Array<{ id: string; title: string }>;
}

const typeIcon: Record<string, React.ComponentType<{ className?: string }>> = { VIDEO: PlayCircle, TEXT: FileText, LIVE: Video, QUIZ: ListChecks, ASSIGNMENT: ClipboardList, PROJECT: FolderKanban, RESOURCE: Paperclip };
const LESSON_TYPES = [{ value: "VIDEO", label: "Video" }, { value: "TEXT", label: "Reading" }, { value: "LIVE", label: "Live session" }, { value: "QUIZ", label: "Quiz" }, { value: "ASSIGNMENT", label: "Assignment" }, { value: "PROJECT", label: "Project" }, { value: "RESOURCE", label: "Resources" }];

export function CurriculumBuilder({ courseId, modules, quizzes, assignments, projects }: CurriculumBuilderProps) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [moduleDialog, setModuleDialog] = React.useState<{ id?: string; title: string; description: string; isPublished: boolean } | null>(null);
  const [unitDialog, setUnitDialog] = React.useState<{ id?: string; moduleId: string; title: string } | null>(null);
  const [lessonDialog, setLessonDialog] = React.useState<{ unitId: string; lesson: Partial<BuilderLesson> } | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: { message: string } }>, success?: string) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) { toast.error(res.error?.message ?? "Something went wrong."); return; }
      if (success) toast.success(success);
      router.refresh();
    });

  const move = (kind: "module" | "unit" | "lesson", ids: string[], index: number, dir: -1 | 1) => {
    const next = ids.slice();
    const to = index + dir;
    if (to < 0 || to >= next.length) return;
    [next[index], next[to]] = [next[to]!, next[index]!];
    run(() => reorderAction(kind, courseId, { ids: next }));
  };

  const saveLesson = () => {
    if (!lessonDialog) return;
    const l = lessonDialog.lesson;
    run(
      () =>
        saveLessonAction(
          {
            unitId: lessonDialog.unitId,
            title: l.title ?? "",
            type: (l.type as never) ?? "VIDEO",
            content: l.content ?? "",
            videoMediaId: l.video?.mediaId ?? null,
            videoUrl: l.videoUrl ?? "",
            durationSeconds: l.durationSeconds ?? 0,
            isPreview: l.isPreview ?? false,
            isPublished: l.isPublished ?? true,
            objectives: l.objectives ?? [],
            quizId: l.type === "QUIZ" ? (l.quizId ?? null) : null,
            assignmentId: l.type === "ASSIGNMENT" ? (l.assignmentId ?? null) : null,
            projectId: l.type === "PROJECT" ? (l.projectId ?? null) : null,
            resources: (l.resources ?? []).map((r) => ({ title: r.title, type: r.type as never, url: r.url ?? "", mediaId: r.mediaId ?? null })),
          },
          l.id,
        ),
      "Lesson saved.",
    );
    setLessonDialog(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-body-sm text-fg-muted">{modules.length} modules · {modules.reduce((s, m) => s + m.units.reduce((x, u) => x + u.lessons.length, 0), 0)} lessons</p>
        <Button size="sm" onClick={() => setModuleDialog({ title: "", description: "", isPublished: true })}><Plus /> Add module</Button>
      </div>
      {modules.length ? (
        <ol className="flex flex-col gap-3">
          {modules.map((m, mi) => (
            <li key={m.id} className={cn("surface overflow-hidden", !m.isPublished && "opacity-70")}>
              <div className="flex items-center gap-2 border-b border-border bg-bg-subtle px-3 py-2">
                <GripVertical className="size-4 text-fg-subtle" />
                <p className="min-w-0 flex-1 truncate text-sm font-semibold">{String(mi + 1).padStart(2, "0")} · {m.title}</p>
                {!m.isPublished ? <Badge>Hidden</Badge> : null}
                <IconButton label="Move up" size="sm" disabled={mi === 0 || pending} onClick={() => move("module", modules.map((x) => x.id), mi, -1)}><ChevronUp /></IconButton>
                <IconButton label="Move down" size="sm" disabled={mi === modules.length - 1 || pending} onClick={() => move("module", modules.map((x) => x.id), mi, 1)}><ChevronDown /></IconButton>
                <IconButton label="Edit module" size="sm" onClick={() => setModuleDialog({ id: m.id, title: m.title, description: m.description ?? "", isPublished: m.isPublished })}><Pencil /></IconButton>
                <IconButton label="Delete module" size="sm" onClick={() => window.confirm(`Delete module "${m.title}" and all its lessons?`) && run(() => deleteModuleAction(m.id), "Module deleted.")}><Trash2 /></IconButton>
                <Button size="sm" variant="ghost" onClick={() => setUnitDialog({ moduleId: m.id, title: "" })}><Plus /> Unit</Button>
              </div>
              <div className="flex flex-col divide-y divide-border">
                {m.units.map((u, ui) => (
                  <div key={u.id} className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <p className="min-w-0 flex-1 truncate text-caption font-medium text-fg-muted">{u.title}</p>
                      <IconButton label="Move up" size="sm" disabled={ui === 0 || pending} onClick={() => move("unit", m.units.map((x) => x.id), ui, -1)}><ChevronUp /></IconButton>
                      <IconButton label="Move down" size="sm" disabled={ui === m.units.length - 1 || pending} onClick={() => move("unit", m.units.map((x) => x.id), ui, 1)}><ChevronDown /></IconButton>
                      <IconButton label="Rename unit" size="sm" onClick={() => setUnitDialog({ id: u.id, moduleId: m.id, title: u.title })}><Pencil /></IconButton>
                      <IconButton label="Delete unit" size="sm" onClick={() => window.confirm(`Delete unit "${u.title}"?`) && run(() => deleteUnitAction(u.id), "Unit deleted.")}><Trash2 /></IconButton>
                      <Button size="sm" variant="ghost" onClick={() => setLessonDialog({ unitId: u.id, lesson: { type: "VIDEO", isPublished: true, objectives: [], resources: [] } })}><Plus /> Lesson</Button>
                    </div>
                    <ul className="mt-1 flex flex-col">
                      {u.lessons.map((l, li) => {
                        const Icon = typeIcon[l.type] ?? FileText;
                        return (
                          <li key={l.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-bg-subtle">
                            <Icon className="size-4 shrink-0 text-fg-subtle" />
                            <span className={cn("min-w-0 flex-1 truncate", !l.isPublished && "text-fg-subtle line-through")}>{l.title}</span>
                            {l.isPreview ? <Badge variant="accent">Preview</Badge> : null}
                            {l.durationSeconds ? <span className="text-caption tabular-nums text-fg-subtle">{formatDuration(l.durationSeconds)}</span> : null}
                            <IconButton label="Move up" size="sm" disabled={li === 0 || pending} onClick={() => move("lesson", u.lessons.map((x) => x.id), li, -1)}><ChevronUp /></IconButton>
                            <IconButton label="Move down" size="sm" disabled={li === u.lessons.length - 1 || pending} onClick={() => move("lesson", u.lessons.map((x) => x.id), li, 1)}><ChevronDown /></IconButton>
                            <IconButton label="Edit lesson" size="sm" onClick={() => setLessonDialog({ unitId: u.id, lesson: l })}><Pencil /></IconButton>
                            <IconButton label="Delete lesson" size="sm" onClick={() => window.confirm(`Delete lesson "${l.title}"?`) && run(() => deleteLessonAction(l.id), "Lesson deleted.")}><Trash2 /></IconButton>
                          </li>
                        );
                      })}
                      {!u.lessons.length ? <li className="px-2 py-1.5 text-caption text-fg-subtle">No lessons yet.</li> : null}
                    </ul>
                  </div>
                ))}
                {!m.units.length ? <p className="px-3 py-3 text-caption text-fg-subtle">Add a unit to start adding lessons.</p> : null}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-body-sm text-fg-muted">No modules yet. Add the first module to build the curriculum, or generate a draft with AI from the course builder.</div>
      )}

      {/* Module dialog */}
      <Dialog open={!!moduleDialog} onOpenChange={(v) => !v && setModuleDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{moduleDialog?.id ? "Edit module" : "New module"}</DialogTitle></DialogHeader>
          {moduleDialog ? (
            <div className="grid gap-4">
              <Field label="Title" htmlFor="m-title"><Input id="m-title" value={moduleDialog.title} onChange={(e) => setModuleDialog({ ...moduleDialog, title: e.target.value })} /></Field>
              <Field label="Description" htmlFor="m-desc"><Textarea id="m-desc" rows={3} value={moduleDialog.description} onChange={(e) => setModuleDialog({ ...moduleDialog, description: e.target.value })} /></Field>
              {moduleDialog.id ? <div className="flex items-center justify-between"><Label htmlFor="m-pub">Visible to students</Label><Switch id="m-pub" checked={moduleDialog.isPublished} onCheckedChange={(v) => setModuleDialog({ ...moduleDialog, isPublished: v })} /></div> : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setModuleDialog(null)}>Cancel</Button>
            <Button loading={pending} onClick={() => { if (!moduleDialog) return; const d = moduleDialog; setModuleDialog(null); run(() => (d.id ? updateModuleAction(d.id, { title: d.title, description: d.description, isPublished: d.isPublished }) : createModuleAction({ courseId, title: d.title, description: d.description })), "Module saved."); }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unit dialog */}
      <Dialog open={!!unitDialog} onOpenChange={(v) => !v && setUnitDialog(null)}>
        <DialogContent size="sm">
          <DialogHeader><DialogTitle>{unitDialog?.id ? "Rename unit" : "New unit"}</DialogTitle></DialogHeader>
          {unitDialog ? <Field label="Title" htmlFor="u-title"><Input id="u-title" value={unitDialog.title} onChange={(e) => setUnitDialog({ ...unitDialog, title: e.target.value })} /></Field> : null}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setUnitDialog(null)}>Cancel</Button>
            <Button loading={pending} onClick={() => { if (!unitDialog) return; const d = unitDialog; setUnitDialog(null); run(() => (d.id ? updateUnitAction(d.id, d.title) : createUnitAction({ moduleId: d.moduleId, title: d.title })), "Unit saved."); }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lesson dialog */}
      <Dialog open={!!lessonDialog} onOpenChange={(v) => !v && setLessonDialog(null)}>
        <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{lessonDialog?.lesson.id ? "Edit lesson" : "New lesson"}</DialogTitle></DialogHeader>
          {lessonDialog ? (
            <LessonEditor value={lessonDialog.lesson} onChange={(lesson) => setLessonDialog({ ...lessonDialog, lesson })} quizzes={quizzes} assignments={assignments} projects={projects} />
          ) : null}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setLessonDialog(null)}>Cancel</Button>
            <Button loading={pending} onClick={saveLesson} disabled={!lessonDialog?.lesson.title?.trim()}>Save lesson</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LessonEditor({ value, onChange, quizzes, assignments, projects }: { value: Partial<BuilderLesson>; onChange: (v: Partial<BuilderLesson>) => void; quizzes: Array<{ id: string; title: string }>; assignments: Array<{ id: string; title: string }>; projects: Array<{ id: string; title: string }> }) {
  const set = <K extends keyof BuilderLesson>(k: K, v: BuilderLesson[K]) => onChange({ ...value, [k]: v });
  const [objDraft, setObjDraft] = React.useState("");
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
        <Field label="Title" htmlFor="l-title"><Input id="l-title" value={value.title ?? ""} onChange={(e) => set("title", e.target.value)} /></Field>
        <Field label="Type" htmlFor="l-type"><SimpleSelect value={value.type ?? "VIDEO"} onValueChange={(v) => set("type", v)} options={LESSON_TYPES} /></Field>
      </div>
      {value.type === "VIDEO" ? (
        <div className="grid gap-4">
          <div className="flex flex-col gap-2"><Label>Upload video</Label><FileUploader kind="video" accept="video/*" maxSizeMb={2048} folder="lessons" value={value.video ? [value.video] : []} onChange={(f) => set("video", f[0] ?? null)} hint="MP4 or WebM · up to 2 GB" /></div>
          <Field label="…or external video URL" htmlFor="l-url" hint="YouTube, Vimeo or a direct MP4 link"><Input id="l-url" type="url" value={value.videoUrl ?? ""} onChange={(e) => set("videoUrl", e.target.value)} /></Field>
          <Field label="Duration (minutes)" htmlFor="l-dur"><Input id="l-dur" type="number" min={0} value={Math.round((value.durationSeconds ?? 0) / 60)} onChange={(e) => set("durationSeconds", Number(e.target.value) * 60)} /></Field>
        </div>
      ) : null}
      {value.type === "QUIZ" ? <Field label="Quiz" htmlFor="l-quiz"><Combobox options={quizzes.map((q) => ({ value: q.id, label: q.title }))} value={value.quizId ?? null} onChange={(v) => set("quizId", v)} placeholder="Link a quiz (create one under Quizzes first)" /></Field> : null}
      {value.type === "ASSIGNMENT" ? <Field label="Assignment" htmlFor="l-as"><Combobox options={assignments.map((q) => ({ value: q.id, label: q.title }))} value={value.assignmentId ?? null} onChange={(v) => set("assignmentId", v)} placeholder="Link an assignment" /></Field> : null}
      {value.type === "PROJECT" ? <Field label="Project" htmlFor="l-pr"><Combobox options={projects.map((q) => ({ value: q.id, label: q.title }))} value={value.projectId ?? null} onChange={(v) => set("projectId", v)} placeholder="Link a project" /></Field> : null}
      <div className="flex flex-col gap-2"><Label>{value.type === "TEXT" ? "Reading content" : "Lesson notes"}</Label><RichTextEditor value={value.content ?? ""} onChange={(v) => set("content", v)} minHeight={value.type === "TEXT" ? 320 : 160} /></div>
      <div className="flex flex-col gap-2">
        <Label>Objectives</Label>
        <div className="flex flex-wrap gap-1.5">{(value.objectives ?? []).map((o, i) => <Badge key={i}>{o}<button type="button" onClick={() => set("objectives", (value.objectives ?? []).filter((_, j) => j !== i))} aria-label="Remove">×</button></Badge>)}</div>
        <div className="flex gap-2"><Input value={objDraft} onChange={(e) => setObjDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && objDraft.trim()) { e.preventDefault(); set("objectives", [...(value.objectives ?? []), objDraft.trim()]); setObjDraft(""); } }} placeholder="Add an objective and press Enter" /></div>
      </div>
      <div className="flex flex-col gap-2">
        <Label>Resources</Label>
        {(value.resources ?? []).map((r, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_120px_1fr_auto]">
            <Input value={r.title} onChange={(e) => set("resources", (value.resources ?? []).map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} placeholder="Title" />
            <SimpleSelect value={r.type} onValueChange={(v) => set("resources", (value.resources ?? []).map((x, j) => (j === i ? { ...x, type: v } : x)))} options={[{ value: "FILE", label: "File" }, { value: "LINK", label: "Link" }, { value: "VIDEO", label: "Video" }, { value: "CODE", label: "Code" }]} />
            <Input value={r.url ?? ""} onChange={(e) => set("resources", (value.resources ?? []).map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} placeholder="https://" />
            <IconButton label="Remove" onClick={() => set("resources", (value.resources ?? []).filter((_, j) => j !== i))}><Trash2 /></IconButton>
          </div>
        ))}
        <Button type="button" variant="secondary" size="sm" className="w-fit" onClick={() => set("resources", [...(value.resources ?? []), { title: "", type: "LINK", url: "", mediaId: null }])}><Plus /> Add resource</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-lg border border-border p-3"><Label htmlFor="l-preview" className="gap-2"><Eye className="size-4" /> Free preview</Label><Switch id="l-preview" checked={value.isPreview ?? false} onCheckedChange={(v) => set("isPreview", v)} /></div>
        <div className="flex items-center justify-between rounded-lg border border-border p-3"><Label htmlFor="l-pub" className="gap-2"><EyeOff className="size-4" /> Published</Label><Switch id="l-pub" checked={value.isPublished ?? true} onCheckedChange={(v) => set("isPublished", v)} /></div>
      </div>
    </div>
  );
}
