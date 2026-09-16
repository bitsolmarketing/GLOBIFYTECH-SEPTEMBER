import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle, AlertTriangle } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { instructorScope } from "@/server/services/instructor-scope";
import { prisma } from "@/server/db/prisma";
import { attendanceSummary } from "@/server/services/batches";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { enumLabel, formatDateTime, relativeTime, toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Student" };
export const dynamic = "force-dynamic";

export default async function InstructorStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);
  const scope = await instructorScope(user);
  const s = await prisma.studentProfile.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, avatar: { select: { url: true } } } },
      enrollments: { where: { course: scope.courseWhere }, include: { course: { select: { id: true, title: true } }, batch: { select: { id: true, code: true, name: true } }, progress: true }, orderBy: { createdAt: "desc" } },
      quizAttempts: { where: { status: "GRADED", quiz: { course: scope.courseWhere } }, orderBy: { submittedAt: "desc" }, take: 10, include: { quiz: { select: { title: true } } } },
      submissions: { where: { assignment: { course: scope.courseWhere } }, orderBy: { createdAt: "desc" }, take: 10, include: { assignment: { select: { title: true } } } },
      projectSubmissions: { where: { project: { course: scope.courseWhere } }, orderBy: { createdAt: "desc" }, take: 10, include: { project: { select: { title: true } } } },
      riskScores: { orderBy: { computedAt: "desc" }, take: 1 },
    },
  });
  if (!s || (!scope.bypass && !s.enrollments.length)) notFound();
  const attendance = await Promise.all(s.enrollments.filter((e) => e.batchId).map(async (e) => ({ batch: e.batch!, ...(await attendanceSummary(e.batchId!, s.id)) })));
  const risk = s.riskScores[0];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader breadcrumbs={[{ label: "Students", href: "/instructor/students" }, { label: s.user.name }]} title={s.user.name} description={`${s.studentNumber} · ${s.user.email}${s.user.phone ? ` · ${s.user.phone}` : ""}`} actions={<Button asChild variant="secondary"><Link href={`/instructor/messages?to=${s.user.id}`}><MessageCircle /> Message</Link></Button>} />
      {risk && risk.level !== "LOW" ? (
        <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning-soft p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-4 text-warning" />
          <div><p className="font-medium">{risk.level} risk · score {risk.score}</p><p className="text-fg-muted">{risk.reasons.join(" · ")}</p><p className="mt-1 text-caption text-fg-muted">{risk.recommendation}</p></div>
        </div>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-7">
          <section className="surface p-5">
            <h2 className="text-h4 mb-3">Enrollments</h2>
            <ul className="flex flex-col divide-y divide-border">
              {s.enrollments.map((e) => (
                <li key={e.id} className="flex items-center gap-4 py-3">
                  <div className="min-w-0 flex-1"><p className="font-medium">{e.course.title}</p><p className="text-caption text-fg-muted">{e.batch?.name ?? "No batch"} · started {formatDateTime(e.startedAt)}{e.progress?.lastActivityAt ? ` · active ${relativeTime(e.progress.lastActivityAt)}` : ""}</p></div>
                  <div className="w-28"><Progress value={toNumber(e.progress?.percent ?? 0)} size="sm" /></div>
                  <Badge variant={statusVariant(e.status)}>{enumLabel(e.status)}</Badge>
                </li>
              ))}
            </ul>
          </section>
          <section className="surface p-5">
            <h2 className="text-h4 mb-3">Recent work</h2>
            <ul className="flex flex-col divide-y divide-border text-sm">
              {s.quizAttempts.map((a) => <li key={a.id} className="flex items-center justify-between py-2"><span>Quiz · {a.quiz.title}</span><Badge variant={a.passed ? "success" : "danger"}>{toNumber(a.percent)}%</Badge></li>)}
              {s.submissions.map((a) => <li key={a.id} className="flex items-center justify-between py-2"><Link href={`/instructor/submissions/${a.id}`} className="hover:text-accent">Assignment · {a.assignment.title}</Link><Badge variant={statusVariant(a.status)}>{enumLabel(a.status)}</Badge></li>)}
              {s.projectSubmissions.map((a) => <li key={a.id} className="flex items-center justify-between py-2"><Link href={`/instructor/grading/project/${a.id}`} className="hover:text-accent">Project · {a.project.title}</Link><Badge variant={statusVariant(a.status)}>{enumLabel(a.status)}</Badge></li>)}
              {!s.quizAttempts.length && !s.submissions.length && !s.projectSubmissions.length ? <li className="py-2 text-caption text-fg-subtle">Nothing submitted yet.</li> : null}
            </ul>
          </section>
        </div>
        <aside className="flex flex-col gap-4 lg:col-span-5">
          <div className="surface flex items-center gap-4 p-5"><Avatar name={s.user.name} src={s.user.avatar?.url} size="lg" /><div><p className="font-medium">{s.user.name}</p><p className="text-caption text-fg-muted">{s.city ?? "—"}{s.education ? ` · ${s.education}` : ""}</p></div></div>
          {attendance.length ? (
            <div className="surface flex flex-col gap-2 p-5">
              <p className="text-label text-fg-subtle">Attendance</p>
              {attendance.map((a) => (
                <div key={a.batch.id} className="flex items-center justify-between text-sm"><Link href={`/instructor/batches/${a.batch.id}`} className="hover:text-accent">{a.batch.name}</Link><Badge variant={a.percent == null ? "default" : a.percent >= 75 ? "success" : "warning"}>{a.percent == null ? "no data" : `${a.percent}%`}</Badge></div>
              ))}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
