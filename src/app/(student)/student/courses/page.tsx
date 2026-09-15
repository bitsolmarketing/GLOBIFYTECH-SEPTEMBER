import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { requireStudentProfile } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { COURSE_CARD_SELECT } from "@/server/services/courses";
import { PageHeader } from "@/components/layout/page-header";
import { CourseCard } from "@/components/lms/course-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "My courses" };
export const dynamic = "force-dynamic";

export default async function StudentCoursesPage() {
  const { studentId } = await requireStudentProfile();
  const enrollments = await prisma.enrollment.findMany({ where: { studentId }, orderBy: { updatedAt: "desc" }, include: { course: { select: COURSE_CARD_SELECT }, progress: true } });
  const active = enrollments.filter((e) => e.status === "ACTIVE");
  const completed = enrollments.filter((e) => e.status === "COMPLETED");
  const other = enrollments.filter((e) => !["ACTIVE", "COMPLETED"].includes(e.status));
  const grid = (list: typeof enrollments) =>
    list.length ? (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((e) => (
          <CourseCard key={e.id} course={e.course} href={`/student/course/${e.course.id}`} progress={toNumber(e.progress?.percent ?? 0)} />
        ))}
      </div>
    ) : (
      <EmptyState compact title="Nothing here yet." />
    );
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My courses" description={`${active.length} in progress · ${completed.length} completed`} actions={<Button asChild variant="secondary"><Link href="/courses">Browse catalogue</Link></Button>} />
      {enrollments.length ? (
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">In progress ({active.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
            {other.length ? <TabsTrigger value="other">Other ({other.length})</TabsTrigger> : null}
          </TabsList>
          <TabsContent value="active">{grid(active)}</TabsContent>
          <TabsContent value="completed">{grid(completed)}</TabsContent>
          <TabsContent value="other">{grid(other)}</TabsContent>
        </Tabs>
      ) : (
        <EmptyState icon={<BookOpen />} title="You're not enrolled in any course yet." description="Pick a course and your learning space is ready in seconds." action={<Button asChild><Link href="/courses">Browse courses</Link></Button>} />
      )}
    </div>
  );
}
