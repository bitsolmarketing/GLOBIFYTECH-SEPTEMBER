import Link from "next/link";
import { AdminTable, Row, Cell } from "@/components/admin/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/lib/utils";

export interface AssessmentRow {
  id: string;
  title: string;
  courseId: string;
  courseTitle: string;
  published: boolean;
  meta: string;
  when: Date | null;
  attempts: number;
  average: number | null;
  passRate: number | null;
  pending?: number;
}

/** Institute-wide list of quizzes, assignments or exams with live performance. */
export function AssessmentOverview({ rows, kind, emptyIcon }: { rows: AssessmentRow[]; kind: "quiz" | "assignment" | "exam"; emptyIcon: React.ReactNode }) {
  if (!rows.length) return <EmptyState icon={emptyIcon} title={`No ${kind}s yet.`} description="Instructors create assessments inside their course in the Studio." />;
  const performanceLabel = kind === "assignment" ? "Approval rate" : "Pass rate";
  return (
    <AdminTable headers={["Title", "Course", "Details", { label: "Attempts", align: "end" }, { label: "Average", align: "end" }, { label: performanceLabel, align: "end" }, "Status"]}>
      {rows.map((r) => (
        <Row key={r.id}>
          <Cell><Link href={`/instructor/${kind === "quiz" ? "quizzes" : kind === "assignment" ? "assignments" : "exams"}/${r.id}`} className="font-medium hover:text-accent">{r.title}</Link>{r.pending ? <span className="block text-caption text-warning">{r.pending} waiting for grading</span> : null}</Cell>
          <Cell muted><Link href={`/admin/courses/${r.courseId}`} className="hover:text-accent">{r.courseTitle}</Link></Cell>
          <Cell className="text-caption text-fg-muted">{r.meta}{r.when ? <span className="block text-fg-subtle">{formatDateTime(r.when)}</span> : null}</Cell>
          <Cell align="end">{r.attempts}</Cell>
          <Cell align="end">{r.average !== null ? `${r.average}%` : "—"}</Cell>
          <Cell align="end">{r.passRate !== null ? <div className="flex items-center justify-end gap-2"><Progress value={r.passRate} size="sm" className="w-16" tone={r.passRate >= 60 ? "success" : "warning"} /><span className="tabular-nums">{r.passRate}%</span></div> : "—"}</Cell>
          <Cell>{r.published ? <Badge variant="success">Published</Badge> : <Badge>Draft</Badge>}</Cell>
        </Row>
      ))}
    </AdminTable>
  );
}
