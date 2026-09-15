"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { submitAssignmentAction } from "@/server/actions/student";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/form";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileUploader, type UploadedFile } from "@/components/ui/file-uploader";
import { toast } from "@/components/ui/toaster";

type Kind = "TEXT" | "FILE" | "URL" | "GITHUB" | "WEBSITE";
const LABELS: Record<Kind, string> = { TEXT: "Text", FILE: "Files", URL: "Link", GITHUB: "GitHub", WEBSITE: "Live site" };

export function AssignmentSubmitForm({ assignmentId, allowedKinds, draft }: { assignmentId: string; allowedKinds: Kind[]; draft: { kind: Kind; text: string | null; url: string | null; files: UploadedFile[] } | null }) {
  const router = useRouter();
  const [kind, setKind] = React.useState<Kind>(draft?.kind ?? allowedKinds[0] ?? "TEXT");
  const [text, setText] = React.useState(draft?.text ?? "");
  const [url, setUrl] = React.useState(draft?.url ?? "");
  const [files, setFiles] = React.useState<UploadedFile[]>(draft?.files ?? []);
  const [pending, start] = React.useTransition();
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});

  const submit = (final: boolean) =>
    start(async () => {
      setErrors({});
      const res = await submitAssignmentAction({ assignmentId, kind, text, url, mediaIds: files.map((f) => f.mediaId), submit: final });
      if (!res.ok) {
        setErrors(res.error.fields ?? {});
        toast.error(res.error.message);
        return;
      }
      toast.success(final ? "Submitted. Your instructor has been notified." : "Draft saved.");
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={kind} onValueChange={(v) => setKind(v as Kind)}>
        <TabsList variant="pill" className="w-full">
          {allowedKinds.map((k) => (
            <TabsTrigger key={k} value={k} className="flex-1">{LABELS[k]}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="TEXT">
          <Field label="Your answer" htmlFor="sub-text" error={errors.text}>
            <Textarea id="sub-text" rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write your answer here…" />
          </Field>
        </TabsContent>
        <TabsContent value="FILE">
          <FileUploader multiple kind="any" maxSizeMb={25} accept=".pdf,.doc,.docx,.zip,image/*,video/*" folder="submissions" value={files} onChange={setFiles} hint="PDF, DOCX, ZIP, images or video · up to 25 MB each" />
        </TabsContent>
        {(["URL", "GITHUB", "WEBSITE"] as Kind[]).map((k) => (
          <TabsContent key={k} value={k}>
            <Field label={k === "GITHUB" ? "GitHub repository URL" : k === "WEBSITE" ? "Live website URL" : "Link"} htmlFor={`sub-url-${k}`} error={errors.url}>
              <Input id={`sub-url-${k}`} type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={k === "GITHUB" ? "https://github.com/you/project" : "https://"} />
            </Field>
          </TabsContent>
        ))}
      </Tabs>
      {kind !== "TEXT" && text.trim() === "" ? (
        <Field label="Notes for your instructor (optional)" htmlFor="sub-notes">
          <Textarea id="sub-notes" rows={3} value={text} onChange={(e) => setText(e.target.value)} />
        </Field>
      ) : null}
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => submit(false)} loading={pending} className="flex-1">
          Save draft
        </Button>
        <Button onClick={() => submit(true)} loading={pending} className="flex-1">
          Submit
        </Button>
      </div>
    </div>
  );
}
