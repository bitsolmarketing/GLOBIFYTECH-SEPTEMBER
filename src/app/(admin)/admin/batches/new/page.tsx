import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/session";
import { batchFormOptions } from "@/server/queries/batch-options";
import { PageHeader } from "@/components/layout/page-header";
import { BatchForm } from "@/components/admin/batch-form";

export const metadata: Metadata = { title: "New batch" };
export const dynamic = "force-dynamic";

export default async function NewBatchPage({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const [sp] = await Promise.all([searchParams, requirePermission("batches.manage")]);
  const options = await batchFormOptions();
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader title="New batch" description="Schedule a cohort. Students can be added after the batch is created." breadcrumbs={[{ label: "Batches", href: "/admin/batches" }, { label: "New" }]} />
      <div className="surface p-6"><BatchForm {...options} initial={sp.course ? { courseId: sp.course } : undefined} /></div>
    </div>
  );
}
