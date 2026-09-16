import type { Metadata } from "next";
import { prisma } from "@/server/db/prisma";
import { getSession } from "@/server/auth/session";
import { PageHero } from "@/components/marketing/page-hero";
import { ApplyForm } from "@/components/marketing/apply-form";
import { buildMetadata } from "@/lib/seo";
import { daysAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = buildMetadata({ title: "Apply online", description: "Apply to a Globify Tech course in ten minutes. Admissions responds within two working days.", path: "/apply" });

export default async function ApplyPage({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const [{ course }, session] = await Promise.all([searchParams, getSession()]);
  const courses = await prisma.course.findMany({
    where: { status: "PUBLISHED", deletedAt: null },
    orderBy: [{ featured: "desc" }, { title: "asc" }],
    select: { id: true, slug: true, title: true, batches: { where: { status: { in: ["PLANNED", "OPEN"] }, deletedAt: null, startDate: { gte: daysAgo(7) } }, orderBy: { startDate: "asc" }, select: { id: true, code: true, name: true, startDate: true, mode: true, capacity: true, _count: { select: { students: { where: { leftAt: null } } } } } } },
  });
  const user = session ? await prisma.user.findUnique({ where: { id: session.id }, select: { firstName: true, lastName: true, name: true, email: true, phone: true } }) : null;
  const [first, ...rest] = (user?.name ?? "").split(" ");
  return (
    <>
      <PageHero eyebrow="Admissions" title="Apply online." description="Ten minutes, six short steps. You can save a draft and come back if you're signed in." crumbs={[{ label: "Admissions", href: "/admissions" }, { label: "Apply" }]} />
      <div className="container-x max-w-4xl py-10 md:py-14">
        <ApplyForm
          courses={courses.map((c) => ({ id: c.id, slug: c.slug, title: c.title, batches: c.batches.map((b) => ({ id: b.id, code: b.code, name: b.name, startDate: b.startDate.toISOString(), mode: b.mode, seatsLeft: Math.max(0, b.capacity - b._count.students) })) }))}
          initialCourseSlug={course}
          signedIn={!!session}
          defaults={user ? { firstName: user.firstName ?? first, lastName: user.lastName ?? rest.join(" "), email: user.email, phone: user.phone ?? "" } : undefined}
        />
      </div>
    </>
  );
}
