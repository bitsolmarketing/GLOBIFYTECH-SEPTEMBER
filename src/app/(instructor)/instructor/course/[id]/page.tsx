import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Users, ListChecks, ClipboardList, FolderKanban, FileCheck2 } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { instructorScope } from "@/server/services/instructor-scope";
import { getCourseForEditing } from "@/server/services/courses";
import { prisma } from "@/server/db/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CourseForm } from "@/components/studio/course-form";
import { CurriculumBuilder } from "@/components/studio/curriculum-builder";
import { CourseStatusActions, CompletionRulesForm } from "@/components/studio/course-status-actions";
import { StatTile } from "@/components/lms/dashboard-widgets";
import { Button } from "@/components/ui/button";
import { can } from "@/lib/rbac";
import { toNumber } from "@/lib/utils";
import { AppError } from "@/server/errors";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const c = await prisma.course.findUnique({ where: { id }, select: { title: true } });
  return { title: c ? `${c.title} · Studio` : "Course" };
}

export default async function InstructorCoursePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const [{ id }, { tab }, user] = await Promise.all([params, searchParams, requireUser()]);
  const scope = await instructorScope(user);
  await scope.assertCourse(id).catch(() => notFound());
  const course = await getCourseForEditing(id).catch((e) => (e instanceof AppError ? null : Promise.reject(e)));
  if (!course) notFound();
  const [categories, skills, instructors, campuses] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true }, orderBy: { order: "asc" }, select: { id: true, name: true } }),
    prisma.skill.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.instructorProfile.findMany({ select: { id: true, user: { select: { name: true } } }, orderBy: { createdAt: "asc" } }),
    prisma.campus.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
  ]);
  const lessonCount = course.modules.reduce((s, m) => s + m.units.reduce((x, u) => x + u.lessons.length, 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader breadcrumbs={[{ label: "Courses", href: "/instructor/courses" }, { label: course.title }]} title={course.title} description={course.subtitle ?? undefined} actions={<CourseStatusActions courseId={course.id} slug={course.slug} status={course.status} canPublish={can(user, "courses.publish")} moduleCount={course.modules.length} />} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile icon={Users} label="Active students" value={course._count.enrollments} tone="accent" />
        <StatTile icon={ListChecks} label="Lessons" value={lessonCount} />
        <StatTile icon={ListChecks} label="Quizzes" value={course.quizzes.length} />
        <StatTile icon={ClipboardList} label="Assignments" value={course.assignments.length} />
        <StatTile icon={FolderKanban} label="Projects" value={course.projects.length} />
      </div>
      <Tabs defaultValue={tab ?? "curriculum"}>
        <TabsList>
          <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="completion">Completion rules</TabsTrigger>
        </TabsList>
        <TabsContent value="curriculum">
          <CurriculumBuilder
            courseId={course.id}
            modules={course.modules.map((m) => ({ id: m.id, title: m.title, description: m.description, isPublished: m.isPublished, units: m.units.map((u) => ({ id: u.id, title: u.title, lessons: u.lessons.map((l) => ({ id: l.id, title: l.title, type: l.type, durationSeconds: l.durationSeconds, isPreview: l.isPreview, isPublished: l.isPublished, content: l.content, videoUrl: l.videoUrl, video: l.video ? { mediaId: l.video.id, url: l.video.url, fileName: l.video.fileName, mime: l.video.mime, size: l.video.size } : null, objectives: l.objectives, quizId: l.quizId, assignmentId: l.assignmentId, projectId: l.projectId, resources: l.resources.map((r) => ({ title: r.title, type: r.type, url: r.url, mediaId: r.mediaId })) })) })) }))}
            quizzes={course.quizzes.map((q) => ({ id: q.id, title: q.title }))}
            assignments={course.assignments.map((a) => ({ id: a.id, title: a.title }))}
            projects={course.projects.map((p) => ({ id: p.id, title: p.title }))}
          />
        </TabsContent>
        <TabsContent value="settings">
          <div className="surface p-6">
            <CourseForm
              courseId={course.id}
              canAssignInstructors={can(user, "instructors.manage") || can(user, "courses.publish")}
              categories={categories}
              skills={skills}
              instructors={instructors.map((i) => ({ id: i.id, name: i.user.name }))}
              campuses={campuses}
              initial={{
                title: course.title, slug: course.slug, subtitle: course.subtitle ?? "", shortDescription: course.shortDescription ?? "", description: course.description ?? "", categoryId: course.categoryId, level: course.level, mode: course.mode, durationWeeks: course.durationWeeks, hoursPerWeek: course.hoursPerWeek, language: course.language, price: toNumber(course.price), discountPrice: course.discountPrice != null ? toNumber(course.discountPrice) : null, currency: course.currency,
                artwork: course.artwork ? { mediaId: course.artwork.id, url: course.artwork.url, fileName: course.artwork.fileName, mime: course.artwork.mime, size: course.artwork.size } : null,
                featured: course.featured, outcomes: course.outcomes, prerequisites: course.prerequisites, careerOutcomes: course.careerOutcomes, faqs: (course.faqs as Array<{ question: string; answer: string }> | null) ?? [], skillIds: course.skills.map((s) => s.skillId), instructorIds: course.instructors.map((i) => i.instructorId), seoTitle: course.seoTitle ?? "", seoDescription: course.seoDescription ?? "", noindex: course.noindex, leaderboardEnabled: course.leaderboardEnabled, campusId: course.campusId,
              }}
            />
          </div>
        </TabsContent>
        <TabsContent value="assessments" className="grid gap-4 md:grid-cols-2">
          {[
            { title: "Quizzes", icon: ListChecks, items: course.quizzes.map((q) => ({ id: q.id, label: `${q.title} · ${q._count.questions} questions`, published: q.isPublished })), href: `/instructor/quizzes?course=${course.id}`, newHref: `/instructor/quizzes/new?course=${course.id}`, base: "/instructor/quizzes" },
            { title: "Assignments", icon: ClipboardList, items: course.assignments.map((a) => ({ id: a.id, label: a.title, published: a.isPublished })), href: `/instructor/assignments?course=${course.id}`, newHref: `/instructor/assignments/new?course=${course.id}`, base: "/instructor/assignments" },
            { title: "Projects", icon: FolderKanban, items: course.projects.map((p) => ({ id: p.id, label: p.title, published: p.isPublished })), href: `/instructor/projects?course=${course.id}`, newHref: `/instructor/projects/new?course=${course.id}`, base: "/instructor/projects" },
            { title: "Exams", icon: FileCheck2, items: course.exams.map((e) => ({ id: e.id, label: e.title, published: e.isPublished })), href: `/instructor/exams?course=${course.id}`, newHref: `/instructor/exams/new?course=${course.id}`, base: "/instructor/exams" },
          ].map((g) => (
            <div key={g.title} className="surface flex flex-col gap-3 p-5">
              <div className="flex items-center justify-between">
                <p className="inline-flex items-center gap-2 font-medium"><g.icon className="size-4 text-accent" /> {g.title}</p>
                <Button asChild size="sm" variant="secondary"><Link href={g.newHref}>New</Link></Button>
              </div>
              <ul className="flex flex-col divide-y divide-border">
                {g.items.map((i) => (
                  <li key={i.id}><Link href={`${g.base}/${i.id}`} className="flex items-center justify-between py-2 text-sm hover:text-accent"><span className="truncate">{i.label}</span><span className="text-caption text-fg-subtle">{i.published ? "Published" : "Draft"}</span></Link></li>
                ))}
                {!g.items.length ? <li className="py-2 text-caption text-fg-subtle">None yet.</li> : null}
              </ul>
            </div>
          ))}
        </TabsContent>
        <TabsContent value="completion">
          <div className="surface max-w-2xl p-6">
            <p className="mb-4 text-body-sm text-fg-muted">These rules decide when a student's enrollment is marked complete and a certificate is issued.</p>
            <CompletionRulesForm courseId={course.id} initial={course.completionRules[0] ? { requireAllLessons: course.completionRules[0].requireAllLessons, minAttendancePercent: course.completionRules[0].minAttendancePercent, minQuizPercent: course.completionRules[0].minQuizPercent, minExamPercent: course.completionRules[0].minExamPercent, requireProjects: course.completionRules[0].requireProjects, requirePaymentClear: course.completionRules[0].requirePaymentClear, autoIssueCertificate: course.completionRules[0].autoIssueCertificate, certificateValidityMonths: course.completionRules[0].certificateValidityMonths } : { requireAllLessons: true, minAttendancePercent: null, minQuizPercent: null, minExamPercent: null, requireProjects: false, requirePaymentClear: false, autoIssueCertificate: true, certificateValidityMonths: null }} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
