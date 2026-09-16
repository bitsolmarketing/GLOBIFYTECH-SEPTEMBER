import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SimpleSelectLink } from "./course-filter-link";

export interface AssessmentRow {
  id: string;
  title: string;
  course: { id: string; title: string };
  meta: string;
  isPublished: boolean;
  extra?: string;
}

export function AssessmentList({ title, description, base, rows, courses, activeCourse, icon }: { title: string; description: string; base: string; rows: AssessmentRow[]; courses: Array<{ id: string; title: string }>; activeCourse?: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} description={description} actions={<Button asChild><Link href={`${base}/new${activeCourse ? `?course=${activeCourse}` : ""}`}><Plus /> New</Link></Button>}>
        <SimpleSelectLink base={base} courses={courses} active={activeCourse} />
      </PageHeader>
      {rows.length ? (
        <div className="surface overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-subtle text-label text-fg-subtle"><tr><th className="p-3 text-start">Title</th><th className="p-3 text-start">Course</th><th className="p-3 text-start">Details</th><th className="p-3 text-end">Status</th></tr></thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-bg-subtle/60">
                  <td className="p-3"><Link href={`${base}/${r.id}`} className="font-medium hover:text-accent">{r.title}</Link>{r.extra ? <span className="ms-2 text-caption text-fg-subtle">{r.extra}</span> : null}</td>
                  <td className="p-3 text-fg-muted">{r.course.title}</td>
                  <td className="p-3 text-fg-muted">{r.meta}</td>
                  <td className="p-3 text-end">{r.isPublished ? <Badge variant="success">Published</Badge> : <Badge>Draft</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={icon} title={`No ${title.toLowerCase()} yet.`} description="Create one and link it to a lesson from the curriculum builder." action={<Button asChild variant="secondary"><Link href={`${base}/new`}>Create</Link></Button>} />
      )}
    </div>
  );
}
