import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, UserMinus } from "lucide-react";
import { requirePermission } from "@/server/auth/session";
import { getInstructor } from "@/server/services/instructors";
import { instructorAnalytics } from "@/server/services/analytics";
import { prisma } from "@/server/db/prisma";
import { deactivateInstructorAction } from "@/server/actions/admin";
import { PageHeader } from "@/components/layout/page-header";
import { InstructorForm } from "@/components/admin/instructor-form";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { AdminTable, Row, Cell } from "@/components/admin/table";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { enumLabel, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Instructor" };
export const dynamic = "force-dynamic";

export default async function InstructorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }] = await Promise.all([params, requirePermission("instructors.manage")]);
  const [i, campuses, analytics] = await Promise.all([getInstructor(id), prisma.campus.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }), instructorAnalytics(id)]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader breadcrumbs={[{ label: "Instructors", href: "/admin/instructors" }, { label: i.user.name }]} title={i.user.name} description={`${i.title ?? "Instructor"} · ${i.user.email}${i.campus ? ` · ${i.campus.name}` : ""}`} actions={<div className="flex gap-2"><Button asChild variant="outline" size="sm"><Link href={`/instructors/${i.slug}`} target="_blank"><ExternalLink /> Public profile</Link></Button><ConfirmAction title="Deactivate instructor?" description="Removes the instructor role and hides the profile. Courses and batches keep their history." confirmLabel="Deactivate" variant="danger" action={deactivateInstructorAction.bind(null, id)} successMessage="Instructor deactivated."><UserMinus /> Deactivate</ConfirmAction></div>} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <section className="surface p-6">
            <p className="text-h4 mb-4">Profile</p>
            <InstructorForm id={i.id} campuses={campuses} initial={{ name: i.user.name, email: i.user.email, phone: i.user.phone ?? "", title: i.title ?? "", bio: i.bio ?? "", expertise: i.expertise, yearsExperience: i.yearsExperience, linkedinUrl: i.linkedinUrl ?? "", websiteUrl: i.websiteUrl ?? "", isFeatured: i.isFeatured, isPublic: i.isPublic, campusId: i.campusId ?? "" }} />
          </section>
        </div>
        <aside className="flex flex-col gap-6">
          <section>
            <p className="text-h4 mb-3">Courses</p>
            {i.courses.length ? <ul className="surface divide-y divide-border">{i.courses.map((c) => <li key={c.course.id} className="flex items-center justify-between px-4 py-2 text-sm"><Link href={`/admin/courses/${c.course.id}`} className="truncate font-medium hover:text-accent">{c.course.title}</Link><span className="flex items-center gap-2 text-caption text-fg-muted">{c.course.studentCount} students<Badge variant={statusVariant(c.course.status)}>{enumLabel(c.course.status)}</Badge></span></li>)}</ul> : <p className="surface p-4 text-caption text-fg-muted">Not assigned to any course.</p>}
          </section>
          <section>
            <p className="text-h4 mb-3">Batches</p>
            {i.batches.length ? <ul className="surface divide-y divide-border">{i.batches.map((b) => <li key={b.id} className="px-4 py-2 text-sm"><div className="flex items-center justify-between"><Link href={`/admin/batches/${b.id}`} className="font-medium hover:text-accent">{b.code}</Link><Badge variant={statusVariant(b.status)}>{enumLabel(b.status)}</Badge></div><p className="text-caption text-fg-muted">{b.course.title} · {b._count.students} students · {formatDate(b.startDate)}</p></li>)}</ul> : <p className="surface p-4 text-caption text-fg-muted">No batches.</p>}
          </section>
          <section>
            <p className="text-h4 mb-3">Performance</p>
            {analytics.courses.length ? (
              <AdminTable headers={["Course", "Progress", { label: "Inactive", align: "end" }]} dense>
                {analytics.courses.map((c) => <Row key={c.id}><Cell className="text-caption">{c.title}</Cell><Cell><Progress value={c.avgProgress} size="sm" className="w-20" /></Cell><Cell align="end" className="text-caption">{c.inactive7d}</Cell></Row>)}
              </AdminTable>
            ) : <p className="surface p-4 text-caption text-fg-muted">No enrollment data yet.</p>}
            <p className="mt-2 text-caption text-fg-subtle">{analytics.pendingGrading} submissions waiting for grading.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
