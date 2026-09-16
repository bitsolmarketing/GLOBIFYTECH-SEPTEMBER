import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { ProgramManager } from "./program-manager";
import { toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Programs & paths" };
export const dynamic = "force-dynamic";

export default async function ProgramsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const [sp] = await Promise.all([searchParams, requirePermission("programs.manage")]);
  const tab = sp.tab === "paths" ? "paths" : "programs";
  const [programs, paths, courses] = await Promise.all([
    prisma.program.findMany({ orderBy: { createdAt: "desc" }, include: { courses: { orderBy: { order: "asc" }, include: { course: { select: { id: true, title: true } } } } } }),
    prisma.learningPath.findMany({ orderBy: { createdAt: "desc" }, include: { steps: { orderBy: { order: "asc" }, include: { course: { select: { id: true, title: true } } } } } }),
    prisma.course.findMany({ where: { deletedAt: null, status: { not: "ARCHIVED" } }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Programs & learning paths" description="Bundles of courses sold together, and guided routes to a career outcome." />
      <nav className="flex w-full gap-1 border-b border-border">
        <Link href="/admin/programs" className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-medium ${tab === "programs" ? "border-accent text-fg" : "border-transparent text-fg-muted hover:text-fg"}`}>Programs ({programs.length})</Link>
        <Link href="/admin/programs?tab=paths" className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-medium ${tab === "paths" ? "border-accent text-fg" : "border-transparent text-fg-muted hover:text-fg"}`}>Learning paths ({paths.length})</Link>
      </nav>
      <ProgramManager
        tab={tab}
        courses={courses}
        programs={programs.map((p) => ({ id: p.id, title: p.title, slug: p.slug, subtitle: p.subtitle ?? "", description: p.description ?? "", durationWeeks: p.durationWeeks, price: p.price ? toNumber(p.price) : null, featured: p.featured, outcomes: p.outcomes, status: p.status, courseIds: p.courses.map((c) => c.courseId), courseTitles: p.courses.map((c) => c.course.title) }))}
        paths={paths.map((p) => ({ id: p.id, title: p.title, slug: p.slug, description: p.description ?? "", careerGoal: p.careerGoal ?? "", artworkKey: p.artworkKey, featured: p.featured, status: p.status, steps: p.steps.map((s) => ({ title: s.title, description: s.description ?? "", courseId: s.courseId, isOptional: s.isOptional })) }))}
      />
    </div>
  );
}
