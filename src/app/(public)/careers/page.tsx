import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, MapPin, Building2, ArrowRight } from "lucide-react";
import { prisma } from "@/server/db/prisma";
import { PageHero } from "@/components/marketing/page-hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { buildMetadata } from "@/lib/seo";
import { enumLabel, formatMoney, toNumber, formatDate } from "@/lib/utils";

export const revalidate = 300;
export const metadata: Metadata = buildMetadata({ title: "Careers & Jobs", description: "Jobs and internships from Globify Tech hiring partners, plus roles at the institute itself.", path: "/careers" });

export default async function CareersPage() {
  const [jobs, internships] = await Promise.all([
    prisma.job.findMany({ where: { status: "OPEN", OR: [{ closesAt: null }, { closesAt: { gte: new Date() } }] }, orderBy: { postedAt: "desc" }, take: 30, include: { employer: { select: { name: true, slug: true, isHiringPartner: true, logo: { select: { url: true } } } }, skills: { include: { skill: true } } } }),
    prisma.internship.findMany({ where: { status: "OPEN", OR: [{ closesAt: null }, { closesAt: { gte: new Date() } }] }, orderBy: { postedAt: "desc" }, take: 30, include: { employer: { select: { name: true, slug: true, isHiringPartner: true } }, skills: { include: { skill: true } } } }),
  ]);
  return (
    <>
      <PageHero eyebrow="Careers" title="Opportunities from our hiring partners." description="Employers post roles here because they trust our graduates. Sign in as a student to see your match score and apply from the Career Center." crumbs={[{ label: "Home", href: "/" }, { label: "Careers" }]}>
        <Button asChild size="lg" className="mt-2 w-fit">
          <Link href="/student/career">
            Open the Career Center <ArrowRight className="rtl:rotate-180" />
          </Link>
        </Button>
      </PageHero>
      <div className="container-x flex flex-col gap-14 py-12 md:py-16">
        <section>
          <h2 className="text-h2 mb-5">Jobs</h2>
          {jobs.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {jobs.map((j) => (
                <div key={j.id} className="surface flex flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-h4">{j.title}</h3>
                      <p className="inline-flex items-center gap-1.5 text-body-sm text-fg-muted">
                        <Building2 className="size-3.5" /> {j.employer.name}
                        {j.employer.isHiringPartner ? <Badge variant="accent">Hiring partner</Badge> : null}
                      </p>
                    </div>
                    <Badge>{enumLabel(j.type)}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-fg-muted">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3.5" /> {j.isRemote ? "Remote" : (j.location ?? "Pakistan")}
                    </span>
                    {j.salaryMin || j.salaryMax ? <span>{[j.salaryMin && formatMoney(toNumber(j.salaryMin), j.currency), j.salaryMax && formatMoney(toNumber(j.salaryMax), j.currency)].filter(Boolean).join(" – ")}</span> : null}
                    {j.postedAt ? <span>Posted {formatDate(j.postedAt)}</span> : null}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {j.skills.slice(0, 5).map((s) => (
                      <Badge key={s.id} variant="outline">{s.skill.name}</Badge>
                    ))}
                  </div>
                  <Button asChild variant="secondary" size="sm" className="mt-auto w-fit">
                    <Link href="/student/career">
                      <Briefcase /> Apply via Career Center
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No open jobs right now." description="Hiring partners post new roles every month." compact />
          )}
        </section>
        <section>
          <h2 className="text-h2 mb-5">Internships</h2>
          {internships.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {internships.map((i) => (
                <div key={i.id} className="surface flex flex-col gap-3 p-5">
                  <div>
                    <h3 className="text-h4">{i.title}</h3>
                    <p className="text-body-sm text-fg-muted">{i.employer.name}</p>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-fg-muted">
                    <span>{i.isRemote ? "Remote" : (i.location ?? "On-site")}</span>
                    {i.durationWeeks ? <span>{i.durationWeeks} weeks</span> : null}
                    {i.stipend ? <span>Stipend {formatMoney(toNumber(i.stipend), i.currency)}</span> : null}
                  </div>
                  <Button asChild variant="secondary" size="sm" className="mt-auto w-fit">
                    <Link href="/student/career">Apply via Career Center</Link>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No open internships right now." compact />
          )}
        </section>
      </div>
    </>
  );
}
