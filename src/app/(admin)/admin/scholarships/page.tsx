import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { ScholarshipManager } from "./scholarship-manager";
import { toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Scholarships" };
export const dynamic = "force-dynamic";

export default async function ScholarshipsPage() {
  await requirePermission("discounts.manage");
  const scholarships = await prisma.scholarship.findMany({
    orderBy: { createdAt: "desc" },
    include: { awards: { orderBy: { awardedAt: "desc" }, include: { student: { select: { id: true, studentNumber: true, user: { select: { name: true } } } }, _count: { select: { invoices: true } } } } },
  });
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Scholarships" description="Need-based and merit awards. An award reduces the student's next invoice automatically." />
      <ScholarshipManager
        scholarships={scholarships.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description ?? "",
          type: s.type,
          value: toNumber(s.value),
          seats: s.seats,
          criteria: s.criteria ?? "",
          isActive: s.isActive,
          awards: s.awards.map((a) => ({ id: a.id, studentId: a.student.id, studentName: a.student.user.name, studentNumber: a.student.studentNumber, awardedAt: a.awardedAt.toISOString(), note: a.note ?? "", invoices: a._count.invoices })),
        }))}
      />
    </div>
  );
}
