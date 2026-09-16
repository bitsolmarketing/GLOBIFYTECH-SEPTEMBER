import type { Metadata } from "next";
import { requireUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { listGenerations } from "@/server/ai/course-builder";
import { isAiConfigured } from "@/server/ai/provider";
import { instructorScope } from "@/server/services/instructor-scope";
import { PageHeader } from "@/components/layout/page-header";
import { AiCourseBuilder, type GenerationRow } from "@/components/studio/ai-course-builder";
import { CourseForm } from "@/components/studio/course-form";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { can } from "@/lib/rbac";

export const metadata: Metadata = { title: "Course builder" };
export const dynamic = "force-dynamic";

export default async function CourseBuilderPage() {
  const user = await requireUser();
  const scope = await instructorScope(user);
  const [generations, categories, skills, instructors, campuses] = await Promise.all([
    listGenerations({ kind: "COURSE_OUTLINE", ...(scope.bypass ? {} : { requestedById: user.id }) }),
    prisma.category.findMany({ where: { isActive: true }, orderBy: { order: "asc" }, select: { id: true, name: true } }),
    prisma.skill.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.instructorProfile.findMany({ select: { id: true, user: { select: { name: true } } } }),
    prisma.campus.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
  ]);
  const rows: GenerationRow[] = generations.map((g) => ({ id: g.id, status: g.status, createdAt: g.createdAt.toISOString(), requestedBy: g.requestedBy.name, approvedBy: g.approvedBy?.name ?? null, courseId: g.courseId, courseTitle: g.course?.title ?? null, input: g.input as GenerationRow["input"], output: g.output as GenerationRow["output"] }));
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Course builder" description="Start with AI and refine, or author from scratch. Everything stays a draft until published." />
      <Tabs defaultValue="ai">
        <TabsList>
          <TabsTrigger value="ai">AI course builder</TabsTrigger>
          <TabsTrigger value="manual">Create manually</TabsTrigger>
        </TabsList>
        <TabsContent value="ai">
          <AiCourseBuilder enabled={isAiConfigured()} canApprove={can(user, "ai.approve")} generations={rows} categories={categories} />
        </TabsContent>
        <TabsContent value="manual">
          <div className="surface p-6">
            <CourseForm canAssignInstructors={can(user, "instructors.manage") || can(user, "courses.publish")} categories={categories} skills={skills} instructors={instructors.map((i) => ({ id: i.id, name: i.user.name }))} campuses={campuses} initial={{ title: "", slug: "", subtitle: "", shortDescription: "", description: "", categoryId: categories[0]?.id ?? null, level: "BEGINNER", mode: "HYBRID", durationWeeks: 8, hoursPerWeek: 6, language: "en", price: 0, discountPrice: null, currency: "PKR", artwork: null, featured: false, outcomes: [], prerequisites: [], careerOutcomes: [], faqs: [], skillIds: [], instructorIds: scope.instructorId ? [scope.instructorId] : [], seoTitle: "", seoDescription: "", noindex: false, leaderboardEnabled: false, campusId: null }} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
