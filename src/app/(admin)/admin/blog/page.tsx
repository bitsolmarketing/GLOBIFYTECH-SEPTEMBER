import type { Metadata } from "next";
import Link from "next/link";
import { Newspaper, Plus, ExternalLink } from "lucide-react";
import { requirePermission } from "@/server/auth/session";
import { listPostsForStaff } from "@/server/services/cms";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar } from "@/components/admin/filter-bar";
import { AdminTable, Row, Cell } from "@/components/admin/table";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { DeletePostButton } from "./post-actions";
import { enumLabel, formatDate, relativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Blog" };
export const dynamic = "force-dynamic";

const STATUSES = ["DRAFT", "IN_REVIEW", "PUBLISHED", "SCHEDULED", "ARCHIVED"] as const;

export default async function BlogListPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const [sp] = await Promise.all([searchParams, requirePermission("cms.blog.manage")]);
  const page = Number(sp.page ?? 1) || 1;
  const status = STATUSES.find((s) => s === sp.status);
  const { items, total, pageSize } = await listPostsForStaff({ q: sp.q, status, page, pageSize: 25 });
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Blog" description={`${total} posts.`} actions={<Button asChild size="sm"><Link href="/admin/blog/new"><Plus /> New post</Link></Button>} />
      <FilterBar searchPlaceholder="Post title" filters={[{ key: "status", label: "statuses", options: STATUSES.map((s) => ({ value: s, label: enumLabel(s) })) }]} />
      {items.length ? (
        <AdminTable headers={["Post", "Category", "Author", "Reading time", "Published", "Status", { label: "", align: "end" }]}>
          {items.map((p) => (
            <Row key={p.id}>
              <Cell><Link href={`/admin/blog/${p.id}`} className="font-medium hover:text-accent">{p.title}</Link><span className="block text-caption text-fg-subtle">/blog/{p.slug}</span></Cell>
              <Cell muted>{p.category?.name ?? "—"}</Cell>
              <Cell muted>{p.author?.name ?? "—"}</Cell>
              <Cell className="text-caption text-fg-muted">{p.readingMinutes ? `${p.readingMinutes} min` : "—"}</Cell>
              <Cell className="text-caption text-fg-muted">{p.publishedAt ? formatDate(p.publishedAt) : p.scheduledAt ? `scheduled ${formatDate(p.scheduledAt)}` : relativeTime(p.updatedAt)}</Cell>
              <Cell><Badge variant={statusVariant(p.status)}>{enumLabel(p.status)}</Badge></Cell>
              <Cell align="end"><div className="flex justify-end gap-1">{p.status === "PUBLISHED" ? <Button asChild variant="ghost" size="sm"><Link href={`/blog/${p.slug}`} target="_blank" aria-label="View post"><ExternalLink /></Link></Button> : null}<DeletePostButton id={p.id} title={p.title} /></div></Cell>
            </Row>
          ))}
        </AdminTable>
      ) : (
        <EmptyState icon={<Newspaper />} title="No posts yet." description="Publish articles to bring organic traffic to the courses." action={<Button asChild size="sm"><Link href="/admin/blog/new">Write the first post</Link></Button>} />
      )}
      <Pagination page={page} pageSize={pageSize} total={total} hrefFor={(p) => { const q = new URLSearchParams(); for (const [k, v] of Object.entries(sp)) if (v && k !== "page") q.set(k, v); q.set("page", String(p)); return `/admin/blog?${q}`; }} />
    </div>
  );
}
