import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, Users, CheckCircle2, ExternalLink } from "lucide-react";
import { requirePermission } from "@/server/auth/session";
import { requireEmployerProfile, getEmployerDashboard } from "@/server/services/employers";
import { PageHeader } from "@/components/layout/page-header";
import { StatTile } from "@/components/lms/dashboard-widgets";
import { AdminTable, Row, Cell } from "@/components/admin/table";
import { Avatar } from "@/components/ui/avatar";
import { Badge, statusVariant } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ApplicantStatus } from "./applicant-status";
import { enumLabel, formatDate, formatMoney, toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Hiring partner" };
export const dynamic = "force-dynamic";

export default async function EmployerPortal() {
  const user = await requirePermission("employer.self");
  const profile = await requireEmployerProfile(user);
  const { jobs, internships, applications } = await getEmployerDashboard(profile.employerId);
  const hired = applications.filter((a) => a.status === "HIRED").length;
  const openRoles = [...jobs, ...internships].filter((r) => r.status === "OPEN").length;

  return (
    <div className="container-x flex flex-col gap-8 py-10">
      <PageHeader
        eyebrow="Hiring partner"
        title={profile.employer.name}
        description={`${[profile.employer.city, profile.employer.country].filter(Boolean).join(", ")}${profile.jobTitle ? ` · ${profile.jobTitle}` : ""}`}
        actions={<div className="flex gap-2">{profile.employer.isVerified ? <Badge variant="success"><CheckCircle2 className="size-3.5" /> Verified</Badge> : null}{profile.employer.isHiringPartner ? <Badge variant="accent">Hiring partner</Badge> : null}</div>}
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <StatTile icon={Briefcase} label="Open roles" value={openRoles} hint={`${jobs.length} jobs · ${internships.length} internships`} tone="accent" />
        <StatTile icon={Users} label="Applicants" value={applications.length} hint="across all your postings" />
        <StatTile icon={CheckCircle2} label="Hired" value={hired} hint="graduates placed with you" tone="success" />
      </section>

      <section>
        <p className="text-h4 mb-3">Your postings</p>
        {jobs.length || internships.length ? (
          <AdminTable headers={["Role", "Type", "Location", { label: "Applicants", align: "end" }, "Closes", "Status"]}>
            {jobs.map((j) => (
              <Row key={j.id}>
                <Cell className="font-medium">{j.title}<span className="block text-caption text-fg-subtle">{j.skills.map((s) => s.skill.name).join(", ")}</span></Cell>
                <Cell muted>{enumLabel(j.type)}</Cell>
                <Cell muted>{j.isRemote ? "Remote" : j.location || "—"}</Cell>
                <Cell align="end">{j._count.applications}</Cell>
                <Cell className="text-caption text-fg-muted">{j.closesAt ? formatDate(j.closesAt) : "Open ended"}</Cell>
                <Cell><Badge variant={statusVariant(j.status)}>{enumLabel(j.status)}</Badge></Cell>
              </Row>
            ))}
            {internships.map((i) => (
              <Row key={i.id}>
                <Cell className="font-medium">{i.title}<span className="block text-caption text-fg-subtle">{i.skills.map((s) => s.skill.name).join(", ")}</span></Cell>
                <Cell muted>Internship{i.durationWeeks ? ` · ${i.durationWeeks} weeks` : ""}</Cell>
                <Cell muted>{i.isRemote ? "Remote" : i.location || "—"}</Cell>
                <Cell align="end">{i._count.applications}</Cell>
                <Cell className="text-caption text-fg-muted">{i.stipend ? formatMoney(toNumber(i.stipend), i.currency) : "Unpaid"}</Cell>
                <Cell><Badge variant={statusVariant(i.status)}>{enumLabel(i.status)}</Badge></Cell>
              </Row>
            ))}
          </AdminTable>
        ) : (
          <EmptyState icon={<Briefcase />} title="No postings yet." description="Ask your Globify Tech contact to publish a role and it will appear here." />
        )}
      </section>

      <section>
        <p className="text-h4 mb-3">Applicants</p>
        {applications.length ? (
          <AdminTable headers={["Candidate", "Applied for", "Skills", "Certificates", { label: "Match", align: "end" }, "Applied", "Status"]}>
            {applications.map((a) => (
              <Row key={a.id}>
                <Cell>
                  <span className="flex items-center gap-2">
                    <Avatar name={a.student.user.name} src={a.student.user.avatar?.url} size="xs" />
                    <span>
                      <span className="block font-medium">{a.student.user.name}</span>
                      <span className="block text-caption text-fg-subtle">{a.student.headline ?? a.student.user.email}</span>
                    </span>
                  </span>
                  {a.student.portfolio?.isPublic ? <Link href={`/portfolio/${a.student.portfolio.username}`} target="_blank" className="mt-1 inline-flex items-center gap-1 text-caption text-accent hover:underline">Portfolio <ExternalLink className="size-3" /></Link> : null}
                </Cell>
                <Cell muted>{a.job?.title ?? a.internship?.title ?? "—"}</Cell>
                <Cell><div className="flex flex-wrap gap-1">{a.student.skills.slice(0, 4).map((s) => <Badge key={s.skillId} variant={s.verified ? "success" : "default"}>{s.skill.name}</Badge>)}</div></Cell>
                <Cell className="text-caption text-fg-muted">{a.student.certificates.length ? a.student.certificates.map((c) => c.course.title).join(", ") : "—"}</Cell>
                <Cell align="end" className="tabular-nums">{a.matchScore !== null ? `${a.matchScore}%` : "—"}</Cell>
                <Cell className="text-caption text-fg-muted">{formatDate(a.createdAt)}</Cell>
                <Cell><ApplicantStatus applicationId={a.id} status={a.status} /></Cell>
              </Row>
            ))}
          </AdminTable>
        ) : (
          <EmptyState icon={<Users />} title="No applicants yet." description="Graduates who match your skill requirements see your roles in their career hub." />
        )}
      </section>

      <p className="text-caption text-fg-subtle">
        Certificates can be checked at any time on the{" "}
        <Link href="/verify" className="text-accent hover:underline">public verification page</Link>. Candidate contact details are shared only for roles they applied to.
      </p>
    </div>
  );
}
