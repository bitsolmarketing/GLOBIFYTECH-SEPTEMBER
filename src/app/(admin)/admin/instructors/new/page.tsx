import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { InstructorForm } from "@/components/admin/instructor-form";

export const metadata: Metadata = { title: "Add instructor" };
export const dynamic = "force-dynamic";

export default async function NewInstructorPage() {
  await requirePermission("instructors.manage");
  const campuses = await prisma.campus.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader title="Add instructor" description="Creates the account, grants the instructor role and publishes the profile." breadcrumbs={[{ label: "Instructors", href: "/admin/instructors" }, { label: "New" }]} />
      <div className="surface p-6"><InstructorForm campuses={campuses} /></div>
    </div>
  );
}
