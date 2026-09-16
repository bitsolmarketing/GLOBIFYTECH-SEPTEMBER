import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Phone, MapPin, Flame, Award } from "lucide-react";
import { requirePermission } from "@/server/auth/session";
import { getStudentDetail } from "@/server/services/students";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AdminTable, Row, Cell } from "@/components/admin/table";
import { StudentActions, IssueCertificateButton } from "./student-actions";
import { formatDate, formatDateTime, formatMoney, relativeTime, toNumber, enumLabel } from "@/lib/utils";

export const metadata: Metadata = { title: "Student" };
export const dynamic = "force-dynamic";

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requirePermission("students.read")]);
  const s = await getStudentDetail(id);
  const outstanding = s.invoices.reduce((sum, i) => sum + (["ISSUED", "PARTIALLY_PAID", "OVERDUE"].includes(i.status) ? toNumber(i.total) - toNumber(i.amountPaid) : 0), 0);
  const latestRisk = s.riskScores[0];
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Students", href: "/admin/students" }, { label: s.user.name }]}
        title={s.user.name}
        description={`${s.studentNumber} · joined ${formatDate(s.createdAt)}${s.campus ? ` · ${s.campus.name}` : ""}`}
        actions={<StudentActions userId={s.userId} studentId={s.id} status={s.user.status} roles={s.user.roles.map((r) => r.role.key)} canSuspend={can(user, "students.update")} canManageRoles={can(user, "staff.manage")} canEnroll={can(user, "enrollments.manage")} />}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <aside className="flex flex-col gap-4">
          <div className="surface flex flex-col items-center gap-3 p-6 text-center">
            <Avatar name={s.user.name} src={s.user.avatar?.url} size="xl" />
            <div><p className="text-h4">{s.user.name}</p><Badge variant={statusVariant(s.user.status)}>{enumLabel(s.user.status)}</Badge></div>
            <ul className="w-full space-y-1 text-start text-body-sm text-fg-muted">
              <li className="flex items-center gap-2"><Mail className="size-4" /><a href={`mailto:${s.user.email}`} className="truncate hover:text-accent">{s.user.email}</a></li>
              <li className="flex items-center gap-2"><Phone className="size-4" />{s.user.phone ?? "—"}</li>
              <li className="flex items-center gap-2"><MapPin className="size-4" />{s.country}</li>
            </ul>
            <p className="text-caption text-fg-subtle">Last login {s.user.lastLoginAt ? relativeTime(s.user.lastLoginAt) : "never"}</p>
          </div>
          <div className="surface p-5">
            <p className="text-label mb-2 text-fg-subtle">Engagement</p>
            <div className="flex items-center gap-4"><span className="flex items-center gap-1 text-h4"><Flame className="size-5 text-warning" />{s.user.streak?.current ?? 0}</span><span className="text-caption text-fg-muted">day streak · best {s.user.streak?.longest ?? 0}</span></div>
            <div className="mt-3 flex flex-wrap gap-1">{s.user.badges.map((b) => <Badge key={b.badgeId} variant="accent"><Award className="size-3" /> {b.badge.name}</Badge>)}{!s.user.badges.length ? <span className="text-caption text-fg-subtle">No badges yet.</span> : null}</div>
          </div>
          {latestRisk ? <div className="surface p-5"><p className="text-label mb-2 text-fg-subtle">Success engine</p><Badge variant={statusVariant(latestRisk.level)}>{latestRisk.level} · {latestRisk.score}</Badge><ul className="mt-2 list-disc ps-4 text-caption text-fg-muted">{latestRisk.reasons.map((r) => <li key={r}>{r}</li>)}</ul>{latestRisk.recommendation ? <p className="mt-2 text-caption">{latestRisk.recommendation}</p> : null}</div> : null}
          {s.skills.length ? <div className="surface p-5"><p className="text-label mb-2 text-fg-subtle">Skills</p><div className="flex flex-wrap gap-1">{s.skills.map((k) => <Badge key={k.skillId} variant={k.verified ? "success" : "default"}>{k.skill.name} · L{k.level}</Badge>)}</div></div> : null}
          {s.portfolio?.isPublic ? <Link href={`/portfolio/${s.portfolio.username}`} target="_blank" className="text-caption text-accent hover:underline">View public portfolio</Link> : null}
        </aside>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <section>
            <p className="text-h4 mb-3">Enrollments</p>
            {s.enrollments.length ? (
              <AdminTable headers={["Course", "Batch", "Progress", "Status", "Certificate"]}>
                {s.enrollments.map((e) => (
                  <Row key={e.id}>
                    <Cell><Link href={`/admin/courses/${e.course.id}`} className="font-medium hover:text-accent">{e.course.title}</Link><span className="block text-caption text-fg-subtle">since {formatDate(e.startedAt)}</span></Cell>
                    <Cell muted>{e.batch ? <Link href={`/admin/batches/${e.batch.id}`} className="hover:text-accent">{e.batch.code}</Link> : "—"}</Cell>
                    <Cell><div className="flex items-center gap-2"><Progress value={toNumber(e.progress?.percent ?? 0)} size="sm" className="w-24" /><span className="text-caption tabular-nums">{Math.round(toNumber(e.progress?.percent ?? 0))}%</span></div></Cell>
                    <Cell><Badge variant={statusVariant(e.status)}>{enumLabel(e.status)}</Badge></Cell>
                    <Cell>{e.certificate ? <Link href={`/admin/certificates/${e.certificate.id}`} className="text-caption text-accent hover:underline">{e.certificate.certificateNumber}</Link> : e.status === "COMPLETED" && can(user, "certificates.issue") ? <IssueCertificateButton enrollmentId={e.id} /> : <span className="text-caption text-fg-subtle">—</span>}</Cell>
                  </Row>
                ))}
              </AdminTable>
            ) : <p className="surface p-6 text-body-sm text-fg-muted">Not enrolled in any course yet.</p>}
          </section>

          {s.attendance.length ? (
            <section>
              <p className="text-h4 mb-3">Attendance</p>
              <div className="grid gap-3 sm:grid-cols-2">{s.attendance.map((a) => <div key={a.batch.id} className="surface p-4"><div className="flex items-center justify-between"><Link href={`/admin/batches/${a.batch.id}`} className="font-medium hover:text-accent">{a.batch.code}</Link><Badge variant={statusVariant(a.batch.status)}>{enumLabel(a.batch.status)}</Badge></div><p className="mt-1 text-caption text-fg-muted">{a.present}/{a.total} sessions attended</p><Progress value={a.percent ?? 0} size="sm" className="mt-2" tone={(a.percent ?? 100) < 75 ? "warning" : "success"} /></div>)}</div>
            </section>
          ) : null}

          <section>
            <div className="mb-3 flex items-center justify-between"><p className="text-h4">Finance</p>{outstanding > 0 ? <Badge variant="warning">{formatMoney(outstanding)} outstanding</Badge> : <Badge variant="success">Nothing outstanding</Badge>}</div>
            {s.invoices.length ? (
              <AdminTable headers={["Invoice", "Total", "Paid", "Due", "Status"]} dense>
                {s.invoices.map((i) => (
                  <Row key={i.id}>
                    <Cell><Link href={`/admin/invoices/${i.id}`} className="font-medium hover:text-accent">{i.number}</Link></Cell>
                    <Cell>{formatMoney(toNumber(i.total), i.currency)}</Cell>
                    <Cell>{formatMoney(toNumber(i.amountPaid), i.currency)}</Cell>
                    <Cell muted>{i.dueDate ? formatDate(i.dueDate) : "—"}</Cell>
                    <Cell><Badge variant={statusVariant(i.status)}>{enumLabel(i.status)}</Badge></Cell>
                  </Row>
                ))}
              </AdminTable>
            ) : <p className="surface p-6 text-body-sm text-fg-muted">No invoices.</p>}
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-h4 mb-3">Recent quizzes</p>
              {s.quizAttempts.length ? <ul className="surface divide-y divide-border">{s.quizAttempts.map((q) => <li key={q.id} className="flex items-center justify-between px-4 py-2 text-sm"><span className="truncate">{q.quiz.title}</span><span className={q.passed ? "text-caption text-success" : "text-caption text-danger"}>{Math.round(toNumber(q.percent))}% · {q.passed ? "passed" : "failed"}</span></li>)}</ul> : <p className="surface p-4 text-caption text-fg-muted">No graded attempts.</p>}
            </div>
            <div>
              <p className="text-h4 mb-3">Recent submissions</p>
              {s.submissions.length ? <ul className="surface divide-y divide-border">{s.submissions.map((x) => <li key={x.id} className="flex items-center justify-between px-4 py-2 text-sm"><span className="truncate">{x.assignment.title}</span><Badge variant={statusVariant(x.status)}>{enumLabel(x.status)}</Badge></li>)}</ul> : <p className="surface p-4 text-caption text-fg-muted">No submissions.</p>}
            </div>
          </section>

          {s.certificates.length ? (
            <section>
              <p className="text-h4 mb-3">Certificates</p>
              <ul className="surface divide-y divide-border">{s.certificates.map((c) => <li key={c.id} className="flex items-center justify-between px-4 py-2 text-sm"><span><Link href={`/admin/certificates/${c.id}`} className="font-medium hover:text-accent">{c.certificateNumber}</Link><span className="block text-caption text-fg-subtle">{c.course.title} · {formatDateTime(c.issuedAt)}</span></span><Badge variant={statusVariant(c.status)}>{enumLabel(c.status)}</Badge></li>)}</ul>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
