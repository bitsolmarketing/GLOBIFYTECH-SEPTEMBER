import type { Metadata } from "next";
import Link from "next/link";
import { UserCog, Plus } from "lucide-react";
import { requirePermission } from "@/server/auth/session";
import { listInstructors } from "@/server/services/instructors";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar } from "@/components/admin/filter-bar";
import { AdminTable, Row, Cell } from "@/components/admin/table";
import { Avatar } from "@/components/ui/avatar";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { enumLabel } from "@/lib/utils";

export const metadata: Metadata = { title: "Instructors" };
export const dynamic = "force-dynamic";

export default async function InstructorsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const [sp] = await Promise.all([searchParams, requirePermission("instructors.manage")]);
  const page = Number(sp.page ?? 1) || 1;
  const { items, total, pageSize } = await listInstructors({ q: sp.q, page, pageSize: 25 });
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Instructors" description={`${total} instructors and teaching assistants.`} actions={<Button asChild size="sm"><Link href="/admin/instructors/new"><Plus /> Add instructor</Link></Button>} />
      <FilterBar searchPlaceholder="Name, email or expertise" />
      {items.length ? (
        <AdminTable headers={["Instructor", "Title", "Expertise", { label: "Courses", align: "end" }, { label: "Batches", align: "end" }, "Visibility"]}>
          {items.map((i) => (
            <Row key={i.id}>
              <Cell><Link href={`/admin/instructors/${i.id}`} className="flex items-center gap-2 hover:text-accent"><Avatar name={i.user.name} src={i.user.avatar?.url} size="xs" /><span><span className="block font-medium">{i.user.name}</span><span className="block text-caption text-fg-subtle">{i.user.email}</span></span></Link></Cell>
              <Cell muted>{i.title ?? "—"}</Cell>
              <Cell><div className="flex flex-wrap gap-1">{i.expertise.slice(0, 3).map((e) => <Badge key={e}>{e}</Badge>)}{i.expertise.length > 3 ? <span className="text-caption text-fg-subtle">+{i.expertise.length - 3}</span> : null}</div></Cell>
              <Cell align="end">{i._count.courses}</Cell>
              <Cell align="end">{i._count.batches}</Cell>
              <Cell><div className="flex gap-1">{i.user.status !== "ACTIVE" ? <Badge variant={statusVariant(i.user.status)}>{enumLabel(i.user.status)}</Badge> : null}{i.isPublic ? <Badge variant="success">Public</Badge> : <Badge>Hidden</Badge>}{i.isFeatured ? <Badge variant="accent">Featured</Badge> : null}</div></Cell>
            </Row>
          ))}
        </AdminTable>
      ) : (
        <EmptyState icon={<UserCog />} title="No instructors yet." action={<Button asChild size="sm"><Link href="/admin/instructors/new">Add the first instructor</Link></Button>} />
      )}
      <Pagination page={page} pageSize={pageSize} total={total} hrefFor={(p) => `/admin/instructors?page=${p}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`} />
    </div>
  );
}
