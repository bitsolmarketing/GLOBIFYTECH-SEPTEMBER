import type { Metadata } from "next";
import Link from "next/link";
import { FileCheck2 } from "lucide-react";
import { requireStudentProfile } from "@/server/auth/session";
import { examsForStudent } from "@/server/services/exams";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StartExamButton } from "@/components/lms/start-buttons";
import { enumLabel, epochMs, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Exams" };
export const dynamic = "force-dynamic";

export default async function ExamsPage() {
  const { studentId } = await requireStudentProfile();
  const exams = await examsForStudent(studentId);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Exams" description="Timed, proctored-ready assessments. Start only when you're ready — the clock runs even if you close the page." />
      {exams.length ? (
        <ul className="grid gap-4 md:grid-cols-2">
          {exams.map((e) => {
            const opensSoon = !e.scheduledAt || e.scheduledAt.getTime() - epochMs() <= 15 * 60 * 1000;
            const attemptsLeft = e.attemptLimit - e.attempts.length;
            return (
              <li key={e.id} className="surface flex flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-h4 truncate">{e.title}</h2>
                    <p className="text-caption text-fg-muted">{e.course.title} · {enumLabel(e.kind)} · {e._count.questions} questions · {e.durationMinutes} min · pass at {e.passingScore}%</p>
                    {e.scheduledAt ? <p className="text-caption text-fg-subtle">Scheduled {formatDateTime(e.scheduledAt)}</p> : null}
                  </div>
                  {e.best != null ? <Badge variant={e.best >= e.passingScore ? "success" : "danger"}>{e.best}%</Badge> : <Badge>Upcoming</Badge>}
                </div>
                <div className="mt-auto flex items-center justify-between gap-3">
                  <span className="text-caption text-fg-subtle">{e.attempts.length}/{e.attemptLimit} attempts</span>
                  {e.inProgress ? (
                    <Button asChild size="sm"><Link href={`/student/exams/attempt/${e.inProgress.id}`}>Resume</Link></Button>
                  ) : attemptsLeft > 0 && opensSoon ? (
                    <StartExamButton examId={e.id} size="sm" />
                  ) : attemptsLeft > 0 ? (
                    <Button size="sm" variant="secondary" disabled>Opens {e.scheduledAt ? formatDateTime(e.scheduledAt) : "soon"}</Button>
                  ) : e.attempts[0] ? (
                    <Button asChild size="sm" variant="secondary"><Link href={`/student/exams/attempt/${e.attempts[0].id}`}>Result</Link></Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={<FileCheck2 />} title="No exams scheduled." description="Your instructor will announce exams ahead of time." />
      )}
    </div>
  );
}
