import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, ArrowRight } from "lucide-react";
import { requireStudentProfile } from "@/server/auth/session";
import { assignmentsForStudent } from "@/server/services/assignments";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, statusVariant } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { enumLabel, formatDateTime, relativeTime, toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Assignments" };
export const dynamic = "force-dynamic";

export default async function AssignmentsPage() {
  const { studentId } = await requireStudentProfile();
  const items = await assignmentsForStudent(studentId);
  const pending = items.filter((a) => !a.latest || ["DRAFT", "REVISION_REQUESTED", "REJECTED"].includes(a.latest.status));
  const submitted = items.filter((a) => a.latest && ["SUBMITTED", "UNDER_REVIEW"].includes(a.latest.status));
  const done = items.filter((a) => a.latest?.status === "APPROVED");

  const row = (a: (typeof items)[number]) => (
    <li key={a.id}>
      <Link href={`/student/assignments/${a.id}`} className="flex items-center gap-4 p-4 transition-colors hover:bg-bg-subtle">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent"><ClipboardList className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{a.title}</p>
          <p className="text-caption text-fg-muted">
            {a.course.title}
            {a.dueAt ? ` · due ${relativeTime(a.dueAt)} (${formatDateTime(a.dueAt)})` : ""}
            {a.latest?.score != null ? ` · ${toNumber(a.latest.score)}/${toNumber(a.maxPoints)}` : ""}
          </p>
        </div>
        <Badge variant={statusVariant(a.latest?.status ?? "NOT_STARTED")}>{a.latest ? enumLabel(a.latest.status) : "Not started"}</Badge>
        <ArrowRight className="size-4 text-fg-subtle rtl:rotate-180" />
      </Link>
    </li>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Assignments" description={`${pending.length} to do · ${submitted.length} in review · ${done.length} approved`} />
      {items.length ? (
        <>
          {[["To do", pending], ["In review", submitted], ["Approved", done]].map(([label, list]) =>
            (list as typeof items).length ? (
              <section key={label as string} className="flex flex-col gap-2">
                <h2 className="text-label text-fg-subtle">{label as string}</h2>
                <ul className="surface divide-y divide-border">{(list as typeof items).map(row)}</ul>
              </section>
            ) : null,
          )}
        </>
      ) : (
        <EmptyState icon={<ClipboardList />} title="No assignments due right now." description="Assignments appear as your instructor publishes them." />
      )}
    </div>
  );
}
