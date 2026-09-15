"use client";

import * as React from "react";
import { UploadCloud, X, FileText, Image as ImageIcon, Film, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "./progress";

export interface UploadedFile {
  mediaId: string;
  url: string;
  fileName: string;
  mime: string;
  size: number;
}

export interface FileUploaderProps {
  accept?: string; // e.g. "image/*,.pdf"
  maxSizeMb?: number;
  multiple?: boolean;
  kind?: "image" | "video" | "document" | "any";
  value?: UploadedFile[];
  onChange?: (files: UploadedFile[]) => void;
  disabled?: boolean;
  className?: string;
  hint?: string;
  folder?: string;
}

interface PendingFile {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
  result?: UploadedFile;
}

function iconFor(mime: string) {
  if (mime.startsWith("image/")) return <ImageIcon />;
  if (mime.startsWith("video/")) return <Film />;
  return <FileText />;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Uploads directly to storage via a presigned URL. The server never buffers the file.
 * Flow: POST /api/v1/uploads/presign → PUT file → POST /api/v1/uploads/complete
 */
async function uploadOne(file: File, kind: string, folder: string | undefined, onProgress: (p: number) => void): Promise<UploadedFile> {
  const presign = await fetch("/api/v1/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, mime: file.type || "application/octet-stream", size: file.size, kind, folder }),
  });
  if (!presign.ok) {
    const body = await presign.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? "We couldn't prepare the upload.");
  }
  const { data } = (await presign.json()) as { data: { uploadUrl: string; mediaId: string; publicUrl: string; headers?: Record<string, string> } };

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", data.uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    for (const [k, v] of Object.entries(data.headers ?? {})) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Upload failed.")));
    xhr.onerror = () => reject(new Error("Upload failed."));
    xhr.send(file);
  });

  const complete = await fetch("/api/v1/uploads/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mediaId: data.mediaId }),
  });
  if (!complete.ok) throw new Error("We couldn't finalise the upload.");
  return { mediaId: data.mediaId, url: data.publicUrl, fileName: file.name, mime: file.type, size: file.size };
}

function FileUploader({ accept, maxSizeMb = 25, multiple, kind = "any", value = [], onChange, disabled, className, hint, folder }: FileUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [pending, setPending] = React.useState<PendingFile[]>([]);
  const [dragging, setDragging] = React.useState(false);

  const handleFiles = async (list: FileList | null) => {
    if (!list || disabled) return;
    const files = Array.from(list).slice(0, multiple ? 10 : 1);
    const next: PendingFile[] = files.map((file) => ({ id: crypto.randomUUID(), file, progress: 0, status: "uploading" }));
    setPending((p) => [...p, ...next]);
    const results: UploadedFile[] = [];
    for (const item of next) {
      if (item.file.size > maxSizeMb * 1024 * 1024) {
        setPending((p) => p.map((x) => (x.id === item.id ? { ...x, status: "error", error: `Larger than ${maxSizeMb} MB` } : x)));
        continue;
      }
      try {
        const result = await uploadOne(item.file, kind, folder, (progress) =>
          setPending((p) => p.map((x) => (x.id === item.id ? { ...x, progress } : x))),
        );
        results.push(result);
        setPending((p) => p.map((x) => (x.id === item.id ? { ...x, status: "done", progress: 100, result } : x)));
      } catch (e) {
        setPending((p) => p.map((x) => (x.id === item.id ? { ...x, status: "error", error: (e as Error).message } : x)));
      }
    }
    if (results.length) onChange?.(multiple ? [...value, ...results] : results);
    setTimeout(() => setPending((p) => p.filter((x) => x.status !== "done")), 800);
  };

  const remove = (mediaId: string) => onChange?.(value.filter((f) => f.mediaId !== mediaId));

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        role="button"
        tabIndex={0}
        aria-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong bg-bg-subtle/60 px-6 py-8 text-center transition-colors hover:border-accent hover:bg-accent-soft/30 focus-visible:outline-2 focus-visible:outline-accent",
          dragging && "border-accent bg-accent-soft/40",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <UploadCloud className="size-6 text-fg-muted" />
        <p className="text-sm font-medium text-fg">
          Drop {multiple ? "files" : "a file"} here or <span className="text-accent">browse</span>
        </p>
        <p className="text-caption text-fg-subtle">{hint ?? `Up to ${maxSizeMb} MB${accept ? ` · ${accept.replaceAll(",", ", ")}` : ""}`}</p>
        <input ref={inputRef} type="file" accept={accept} multiple={multiple} className="sr-only" onChange={(e) => void handleFiles(e.target.files)} disabled={disabled} />
      </div>

      {(value.length || pending.length) > 0 ? (
        <ul className="flex flex-col gap-2">
          {value.map((f) => (
            <li key={f.mediaId} className="flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2 text-sm">
              <span className="text-fg-muted [&_svg]:size-4">{iconFor(f.mime)}</span>
              <span className="min-w-0 flex-1 truncate">{f.fileName}</span>
              <span className="text-caption text-fg-subtle">{formatSize(f.size)}</span>
              <CheckCircle2 className="size-4 text-success" />
              {!disabled ? (
                <button type="button" onClick={() => remove(f.mediaId)} className="rounded p-0.5 text-fg-subtle hover:text-danger" aria-label={`Remove ${f.fileName}`}>
                  <X className="size-4" />
                </button>
              ) : null}
            </li>
          ))}
          {pending.map((p) => (
            <li key={p.id} className="flex flex-col gap-1.5 rounded-md border border-border bg-surface px-3 py-2 text-sm">
              <div className="flex items-center gap-3">
                <span className="text-fg-muted [&_svg]:size-4">{iconFor(p.file.type)}</span>
                <span className="min-w-0 flex-1 truncate">{p.file.name}</span>
                {p.status === "error" ? <AlertCircle className="size-4 text-danger" /> : <span className="text-caption text-fg-subtle">{p.progress}%</span>}
              </div>
              {p.status === "error" ? <p className="text-caption text-danger">{p.error}</p> : <Progress value={p.progress} size="sm" />}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export { FileUploader };
