import type { Metadata } from "next";
import Link from "next/link";
import { LayoutTemplate, Plus, ExternalLink } from "lucide-react";
import { requirePermission } from "@/server/auth/session";
import { listPages } from "@/server/services/cms";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar } from "@/components/admin/filter-bar";
import { AdminTable, Row, Cell } from "@/components/admin/table";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { NewPageDialog } from "./new-page-dialog";
import { enumLabel, relativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Pages" };
export const dynamic = "force-dynamic";

const STATUSES = ["DRAFT", "PUBLISHED", "SCHEDULED", "ARCHIVED"] as const;

export default async function PagesListPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const [sp, user] = await Promise.all([searchParams, requirePermission("cms.pages.manage")]);
  const status = STATUSES.find((s) => s === sp.status);
  const pages = await listPages({ q: sp.q, status });
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Pages" description="Every public page is built from sections here. Nothing is hard-coded." actions={can(user, "cms.pages.manage") ? <NewPageDialog><Button size="sm"><Plus /> New page</Button></NewPageDialog> : null} />
      <FilterBar searchPlaceholder="Page title or slug" filters={[{ key: "status", label: "statuses", options: STATUSES.map((s) => ({ value: s, label: enumLabel(s) })) }]} />
      {pages.length ? (
        <AdminTable headers={["Page", "URL", { label: "Sections", align: "end" }, "Updated", "Status", { label: "", align: "end" }]}>
          {pages.map((p) => (
            <Row key={p.id}>
              <Cell><Link href={`/admin/pages/${p.id}`} className="font-medium hover:text-accent">{p.title}</Link><span className="block text-caption text-fg-subtle">{p.createdBy ? `by ${p.createdBy.name}` : ""}</span></Cell>
              <Cell className="text-caption text-fg-muted">/{p.slug === "home" ? "" : p.slug}</Cell>
              <Cell align="end">{p._count.sections}</Cell>
              <Cell className="text-caption text-fg-muted">{relativeTime(p.updatedAt)}</Cell>
              <Cell><Badge variant={statusVariant(p.status)}>{enumLabel(p.status)}</Badge></Cell>
              <Cell align="end">{p.status === "PUBLISHED" ? <Button asChild variant="ghost" size="sm"><Link href={p.slug === "home" ? "/" : `/${p.slug}`} target="_blank" aria-label="View page"><ExternalLink /></Link></Button> : null}</Cell>
            </Row>
          ))}
        </AdminTable>
      ) : (
        <EmptyState icon={<LayoutTemplate />} title="No pages yet." description="Create the home page, about page or any landing page from reusable sections." action={<NewPageDialog><Button size="sm">Create a page</Button></NewPageDialog>} />
      )}
    </div>
  );
}
