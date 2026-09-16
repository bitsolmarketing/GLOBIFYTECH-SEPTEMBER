import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { StudentForm } from "./student-form";

export const metadata: Metadata = { title: "Add student" };
export const dynamic = "force-dynamic";

export default async function NewStudentPage() {
  await requirePermission("students.create");
  const campuses = await prisma.campus.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader title="Add student" description="Creates a verified student account. Leave the password blank to send a set-password link by email." breadcrumbs={[{ label: "Students", href: "/admin/students" }, { label: "New" }]} />
      <div className="surface p-6"><StudentForm campuses={campuses} /></div>
    </div>
  );
}
