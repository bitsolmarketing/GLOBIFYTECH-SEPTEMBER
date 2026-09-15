"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { submitProjectAction } from "@/server/actions/student";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { FileUploader, type UploadedFile } from "@/components/ui/file-uploader";
import { toast } from "@/components/ui/toaster";

export function ProjectSubmitForm({ projectId, milestones, draft }: { projectId: string; milestones: Array<{ id: string; title: string }>; draft: { title: string | null; description: string | null; repoUrl: string | null; liveUrl: string | null; milestonesDone: string[]; files: UploadedFile[] } | null }) {
  const router = useRouter();
  const [title, setTitle] = React.useState(draft?.title ?? "");
  const [description, setDescription] = React.useState(draft?.description ?? "");
  const [repoUrl, setRepoUrl] = React.useState(draft?.repoUrl ?? "");
  const [liveUrl, setLiveUrl] = React.useState(draft?.liveUrl ?? "");
  const [done, setDone] = React.useState<string[]>(draft?.milestonesDone ?? []);
  const [files, setFiles] = React.useState<UploadedFile[]>(draft?.files ?? []);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const [pending, start] = React.useTransition();

  const submit = (final: boolean) =>
    start(async () => {
      setErrors({});
      const res = await submitProjectAction({ projectId, title, description, repoUrl, liveUrl, mediaIds: files.map((f) => f.mediaId), milestonesDone: done, submit: final });
      if (!res.ok) {
        setErrors(res.error.fields ?? {});
        toast.error(res.error.message);
        return;
      }
      toast.success(final ? "Project submitted for review." : "Progress saved.");
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-4">
      {milestones.length ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Milestones</p>
          {milestones.map((m) => (
            <label key={m.id} className="flex items-center gap-2 text-body-sm">
              <Checkbox checked={done.includes(m.id)} onCheckedChange={(v) => setDone((d) => (v ? [...d, m.id] : d.filter((x) => x !== m.id)))} /> {m.title}
            </label>
          ))}
        </div>
      ) : null}
      <Field label="Project title" htmlFor="pr-title" error={errors.title}>
        <Input id="pr-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What did you build?" />
      </Field>
      <Field label="Description" htmlFor="pr-desc" error={errors.description}>
        <Textarea id="pr-desc" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What it does, how you built it, what you'd improve." />
      </Field>
      <Field label="Repository URL" htmlFor="pr-repo" error={errors.repoUrl}>
        <Input id="pr-repo" type="url" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="https://github.com/…" />
      </Field>
      <Field label="Live URL" htmlFor="pr-live" error={errors.liveUrl}>
        <Input id="pr-live" type="url" value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)} placeholder="https://…" />
      </Field>
      <FileUploader multiple kind="any" maxSizeMb={25} accept=".pdf,.zip,image/*,video/*" folder="projects" value={files} onChange={setFiles} hint="Screenshots, PDF, ZIP or video · up to 25 MB each" />
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => submit(false)} loading={pending} className="flex-1">
          Save progress
        </Button>
        <Button onClick={() => submit(true)} loading={pending} className="flex-1">
          Submit for review
        </Button>
      </div>
    </div>
  );
}
