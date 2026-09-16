import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { EmployerManager } from "./employer-manager";

export const metadata: Metadata = { title: "Employers" };
export const dynamic = "force-dynamic";

export default async function EmployersPage() {
  await requirePermission("career.jobs.manage");
  const employers = await prisma.employer.findMany({ orderBy: [{ isHiringPartner: "desc" }, { name: "asc" }], include: { _count: { select: { jobs: true, internships: true, members: true } } } });
  const hires = await prisma.jobApplication.groupBy({ by: ["jobId"], where: { status: "HIRED" }, _count: { _all: true } });
  const jobOwners = hires.length ? await prisma.job.findMany({ where: { id: { in: hires.map((h) => h.jobId).filter((x): x is string => !!x) } }, select: { id: true, employerId: true } }) : [];
  const hiresByEmployer = new Map<string, number>();
  for (const h of hires) {
    const employerId = jobOwners.find((j) => j.id === h.jobId)?.employerId;
    if (employerId) hiresByEmployer.set(employerId, (hiresByEmployer.get(employerId) ?? 0) + h._count._all);
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Employers" description="Hiring partners who post jobs and internships for Globify graduates." />
      <EmployerManager
        employers={employers.map((e) => ({ id: e.id, name: e.name, slug: e.slug, website: e.website ?? "", industry: e.industry ?? "", city: e.city ?? "", country: e.country, description: e.description ?? "", isVerified: e.isVerified, isHiringPartner: e.isHiringPartner, jobs: e._count.jobs, internships: e._count.internships, members: e._count.members, hires: hiresByEmployer.get(e.id) ?? 0 }))}
      />
    </div>
  );
}
