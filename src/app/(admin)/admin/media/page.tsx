import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/session";
import { listMedia } from "@/server/services/media";
import { prisma } from "@/server/db/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar } from "@/components/admin/filter-bar";
import { Pagination } from "@/components/ui/pagination";
import { MediaLibrary } from "./media-library";

export const metadata: Metadata = { title: "Media" };
export const dynamic = "force-dynamic";

const KINDS = ["IMAGE", "VIDEO", "DOCUMENT", "AUDIO", "OTHER"] as const;

export default async function MediaPage({ searchParams }: { searchParams: Promise<{ q?: string; kind?: string; folder?: string; page?: string }> }) {
  const [sp] = await Promise.all([searchParams, requirePermission("cms.media.manage")]);
  const page = Number(sp.page ?? 1) || 1;
  const kind = KINDS.find((k) => k === sp.kind);
  const [{ items, total, pageSize }, folders] = await Promise.all([
    listMedia({ q: sp.q, kind, folderId: sp.folder ? sp.folder : undefined, page, pageSize: 40 }),
    prisma.mediaFolder.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { media: true } } } }),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Media" description={`${total} files. Uploads go to the configured storage driver, never into the repository.`} />
      <FilterBar searchPlaceholder="File name, alt text or tag" filters={[{ key: "kind", label: "types", options: KINDS.map((k) => ({ value: k, label: k.charAt(0) + k.slice(1).toLowerCase() })) }, ...(folders.length ? [{ key: "folder", label: "folders", options: folders.map((f) => ({ value: f.id, label: `${f.name} (${f._count.media})` })) }] : [])]} />
      <MediaLibrary
        folders={folders.map((f) => ({ id: f.id, name: f.name, count: f._count.media }))}
        activeFolder={sp.folder ?? null}
        items={items.map((m) => ({ id: m.id, url: m.url, kind: m.kind, mime: m.mime, size: m.size, fileName: m.fileName, alt: m.alt ?? "", caption: m.caption ?? "", tags: m.tags, folderId: m.folderId, usageCount: m.usageCount, uploadedBy: m.uploadedBy?.name ?? null, createdAt: m.createdAt.toISOString() }))}
      />
      <Pagination page={page} pageSize={pageSize} total={total} hrefFor={(p) => { const q = new URLSearchParams(); for (const [k, v] of Object.entries(sp)) if (v && k !== "page") q.set(k, v); q.set("page", String(p)); return `/admin/media?${q}`; }} />
    </div>
  );
}
