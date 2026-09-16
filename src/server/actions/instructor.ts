"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ok, fail, AppError, type ActionResult } from "@/server/errors";
import { requireUser, requirePermission } from "@/server/auth/session";
import { instructorScope } from "@/server/services/instructor-scope";
import { fieldErrors, uuid } from "@/lib/validation/common";
import { courseSchema, moduleSchema, unitSchema, lessonSchema, reorderSchema, completionRuleSchema } from "@/lib/validation/course";
import { quizSchema, questionSchema, assignmentSchema, projectSchema, examSchema, gradeSchema, rubricSchema } from "@/lib/validation/assessment";
import { liveClassSchema, liveClassUpdateSchema, markAttendanceSchema } from "@/lib/validation/delivery";
import { announcementSchema, moderationSchema } from "@/lib/validation/community";
import * as courses from "@/server/services/courses";
import * as quizzes from "@/server/services/quizzes";
import * as assignments from "@/server/services/assignments";
import * as projects from "@/server/services/projects";
import * as exams from "@/server/services/exams";
import * as batches from "@/server/services/batches";
import * as live from "@/server/services/live-classes";
import * as community from "@/server/services/community";
import { courseBriefSchema, generateCourseOutline, reviewGeneration, applyGeneration } from "@/server/ai/course-builder";
import { prisma } from "@/server/db/prisma";
import { audit } from "@/server/audit";
import { can } from "@/lib/rbac";

const revalidateCourse = (courseId: string) => {
  revalidatePath(`/instructor/course/${courseId}`);
  revalidatePath("/instructor/courses");
  revalidatePath(`/admin/courses/${courseId}`);
};

async function scoped() {
  const user = await requireUser();
  if (!can(user, "courses.update") && !can(user, "courses.read")) throw AppError.forbidden();
  return { user, scope: await instructorScope(user) };
}

// ───────────── Courses ─────────────

export async function createCourseAction(input: z.infer<typeof courseSchema>): Promise<ActionResult<{ id: string }>> {
  const parsed = courseSchema.safeParse(input);
  if (!parsed.success) return fail(AppError.validation(undefined, fieldErrors(parsed.error)));
  try {
    const user = await requirePermission("courses.create");
    const scope = await instructorScope(user);
    const instructorIds = parsed.data.instructorIds.length ? parsed.data.instructorIds : scope.instructorId ? [scope.instructorId] : [];
    const course = await courses.createCourse({ ...parsed.data, instructorIds }, user.id);
    await audit({ actorId: user.id, actorRoles: user.roles, action: "course.create", entityType: "Course", entityId: course.id, after: { title: course.title } });
    revalidatePath("/instructor/courses");
    revalidatePath("/admin/courses");
    return ok({ id: course.id });
  } catch (error) {
    return fail(error);
  }
}

export async function updateCourseAction(courseId: string, input: z.infer<typeof courseSchema>): Promise<ActionResult<undefined>> {
  const parsed = courseSchema.safeParse(input);
  if (!parsed.success) return fail(AppError.validation(undefined, fieldErrors(parsed.error)));
  try {
    const { user, scope } = await scoped();
    if (!can(user, "courses.update")) return fail(AppError.forbidden());
    await scope.assertCourse(courseId);
    const before = await prisma.course.findUnique({ where: { id: courseId }, select: { title: true, price: true, status: true } });
    await courses.updateCourse(courseId, parsed.data);
    await audit({ actorId: user.id, actorRoles: user.roles, action: "course.update", entityType: "Course", entityId: courseId, before, after: { title: parsed.data.title, price: parsed.data.price } });
    revalidateCourse(courseId);
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function setCourseStatusAction(courseId: string, status: "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "ARCHIVED"): Promise<ActionResult<undefined>> {
  try {
    const user = await requireUser();
    const scope = await instructorScope(user);
    await scope.assertCourse(courseId);
    if ((status === "PUBLISHED" || status === "ARCHIVED") && !can(user, "courses.publish")) return fail(AppError.forbidden("Only academic managers can publish courses. Submit it for review instead."));
    const before = await prisma.course.findUnique({ where: { id: courseId }, select: { status: true } });
    await courses.setCourseStatus(courseId, status);
    await audit({ actorId: user.id, actorRoles: user.roles, action: `course.${status.toLowerCase()}`, entityType: "Course", entityId: courseId, before, after: { status } });
    revalidateCourse(courseId);
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function saveCompletionRulesAction(input: z.infer<typeof completionRuleSchema>): Promise<ActionResult<undefined>> {
  const parsed = completionRuleSchema.safeParse(input);
  if (!parsed.success) return fail(AppError.validation(undefined, fieldErrors(parsed.error)));
  try {
    const { user, scope } = await scoped();
    await scope.assertCourse(parsed.data.courseId);
    const { courseId, ...data } = parsed.data;
    await prisma.courseCompletionRule.upsert({ where: { courseId }, update: data, create: { courseId, ...data } });
    await audit({ actorId: user.id, actorRoles: user.roles, action: "course.completion_rules", entityType: "Course", entityId: courseId, after: data });
    revalidateCourse(courseId);
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

// ───────────── Curriculum ─────────────

export async function createModuleAction(input: z.infer<typeof moduleSchema>): Promise<ActionResult<{ id: string }>> {
  const parsed = moduleSchema.safeParse(input);
  if (!parsed.success) return fail(AppError.validation(undefined, fieldErrors(parsed.error)));
  try {
    const { scope } = await scoped();
    await scope.assertCourse(parsed.data.courseId);
    const m = await courses.createModule({ courseId: parsed.data.courseId, title: parsed.data.title, description: parsed.data.description || undefined });
    revalidateCourse(parsed.data.courseId);
    return ok({ id: m.id });
  } catch (error) {
    return fail(error);
  }
}

export async function updateModuleAction(id: string, input: { title: string; description?: string; isPublished?: boolean }): Promise<ActionResult<undefined>> {
  try {
    const { scope } = await scoped();
    const m = await prisma.courseModule.findUnique({ where: { id }, select: { courseId: true } });
    if (!m) return fail(AppError.notFound("Module"));
    await scope.assertCourse(m.courseId);
    await courses.updateModule(id, input);
    revalidateCourse(m.courseId);
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function deleteModuleAction(id: string): Promise<ActionResult<undefined>> {
  try {
    const { scope } = await scoped();
    const m = await prisma.courseModule.findUnique({ where: { id }, select: { courseId: true } });
    if (!m) return fail(AppError.notFound("Module"));
    await scope.assertCourse(m.courseId);
    await courses.deleteModule(id);
    revalidateCourse(m.courseId);
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function createUnitAction(input: z.infer<typeof unitSchema>): Promise<ActionResult<{ id: string }>> {
  const parsed = unitSchema.safeParse(input);
  if (!parsed.success) return fail(AppError.validation(undefined, fieldErrors(parsed.error)));
  try {
    const { scope } = await scoped();
    const m = await prisma.courseModule.findUnique({ where: { id: parsed.data.moduleId }, select: { courseId: true } });
    if (!m) return fail(AppError.notFound("Module"));
    await scope.assertCourse(m.courseId);
    const u = await courses.createUnit({ moduleId: parsed.data.moduleId, title: parsed.data.title });
    revalidateCourse(m.courseId);
    return ok({ id: u.id });
  } catch (error) {
    return fail(error);
  }
}

export async function updateUnitAction(id: string, title: string): Promise<ActionResult<undefined>> {
  try {
    const { scope } = await scoped();
    const u = await prisma.courseUnit.findUnique({ where: { id }, select: { module: { select: { courseId: true } } } });
    if (!u) return fail(AppError.notFound("Unit"));
    await scope.assertCourse(u.module.courseId);
    await courses.updateUnit(id, title);
    revalidateCourse(u.module.courseId);
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function deleteUnitAction(id: string): Promise<ActionResult<undefined>> {
  try {
    const { scope } = await scoped();
    const u = await prisma.courseUnit.findUnique({ where: { id }, select: { module: { select: { courseId: true } } } });
    if (!u) return fail(AppError.notFound("Unit"));
    await scope.assertCourse(u.module.courseId);
    await courses.deleteUnit(id);
    revalidateCourse(u.module.courseId);
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function saveLessonAction(input: z.infer<typeof lessonSchema>, lessonId?: string): Promise<ActionResult<{ id: string }>> {
  const parsed = lessonSchema.safeParse(input);
  if (!parsed.success) return fail(AppError.validation(undefined, fieldErrors(parsed.error)));
  try {
    const { scope } = await scoped();
    const u = await prisma.courseUnit.findUnique({ where: { id: parsed.data.unitId }, select: { module: { select: { courseId: true } } } });
    if (!u) return fail(AppError.notFound("Unit"));
    await scope.assertCourse(u.module.courseId);
    const l = lessonId ? await courses.updateLesson(lessonId, parsed.data) : await courses.createLesson(parsed.data);
    revalidateCourse(u.module.courseId);
    return ok({ id: l.id });
  } catch (error) {
    return fail(error);
  }
}

export async function deleteLessonAction(id: string): Promise<ActionResult<undefined>> {
  try {
    const { scope } = await scoped();
    const courseId = await courses.courseIdForLesson(id);
    if (!courseId) return fail(AppError.notFound("Lesson"));
    await scope.assertCourse(courseId);
    await courses.deleteLesson(id);
    revalidateCourse(courseId);
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function reorderAction(kind: "module" | "unit" | "lesson", courseId: string, input: z.infer<typeof reorderSchema>): Promise<ActionResult<undefined>> {
  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) return fail(AppError.validation());
  try {
    const { scope } = await scoped();
    await scope.assertCourse(courseId);
    await courses.reorder(kind, parsed.data.ids);
    revalidateCourse(courseId);
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

// ───────────── Assessments ─────────────

export async function saveQuizAction(input: z.infer<typeof quizSchema>, quizId?: string): Promise<ActionResult<{ id: string }>> {
  const parsed = quizSchema.safeParse(input);
  if (!parsed.success) return fail(AppError.validation(undefined, fieldErrors(parsed.error)));
  try {
    const { scope } = await scoped();
    await scope.assertCourse(parsed.data.courseId);
    const q = quizId ? await quizzes.updateQuiz(quizId, parsed.data) : await quizzes.createQuiz(parsed.data);
    revalidatePath("/instructor/quizzes");
    revalidatePath(`/instructor/quizzes/${q.id}`);
    return ok({ id: q.id });
  } catch (error) {
    return fail(error);
  }
}

export async function deleteQuizAction(quizId: string): Promise<ActionResult<undefined>> {
  try {
    const { scope } = await scoped();
    const q = await prisma.quiz.findUnique({ where: { id: quizId }, select: { courseId: true } });
    if (!q) return fail(AppError.notFound("Quiz"));
    await scope.assertCourse(q.courseId);
    await quizzes.deleteQuiz(quizId);
    revalidatePath("/instructor/quizzes");
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function saveQuestionAction(params: { quizId?: string; examId?: string; questionId?: string; input: z.infer<typeof questionSchema> }): Promise<ActionResult<{ id: string }>> {
  const parsed = questionSchema.safeParse(params.input);
  if (!parsed.success) return fail(AppError.validation(undefined, fieldErrors(parsed.error)));
  try {
    const { scope } = await scoped();
    const owner = params.quizId ? await prisma.quiz.findUnique({ where: { id: params.quizId }, select: { courseId: true } }) : params.examId ? await prisma.exam.findUnique({ where: { id: params.examId }, select: { courseId: true } }) : null;
    if (!owner) return fail(AppError.notFound("Quiz"));
    await scope.assertCourse(owner.courseId);
    const q = await quizzes.upsertQuestion({ quizId: params.quizId, examId: params.examId, questionId: params.questionId, input: parsed.data });
    revalidatePath(params.quizId ? `/instructor/quizzes/${params.quizId}` : `/instructor/exams/${params.examId}`);
    return ok({ id: q.id });
  } catch (error) {
    return fail(error);
  }
}

export async function deleteQuestionAction(questionId: string): Promise<ActionResult<undefined>> {
  try {
    const { scope } = await scoped();
    const q = await prisma.question.findUnique({ where: { id: questionId }, select: { quizId: true, examId: true, quiz: { select: { courseId: true } }, exam: { select: { courseId: true } } } });
    if (!q) return fail(AppError.notFound("Question"));
    await scope.assertCourse(q.quiz?.courseId ?? q.exam?.courseId ?? "");
    await quizzes.deleteQuestion(questionId);
    revalidatePath(q.quizId ? `/instructor/quizzes/${q.quizId}` : `/instructor/exams/${q.examId}`);
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function saveAssignmentAction(input: z.infer<typeof assignmentSchema>, id?: string): Promise<ActionResult<{ id: string }>> {
  const parsed = assignmentSchema.safeParse(input);
  if (!parsed.success) return fail(AppError.validation(undefined, fieldErrors(parsed.error)));
  try {
    const { scope } = await scoped();
    await scope.assertCourse(parsed.data.courseId);
    const a = id ? await assignments.updateAssignment(id, parsed.data) : await assignments.createAssignment(parsed.data);
    revalidatePath("/instructor/assignments");
    return ok({ id: a.id });
  } catch (error) {
    return fail(error);
  }
}

export async function deleteAssignmentAction(id: string): Promise<ActionResult<undefined>> {
  try {
    const { scope } = await scoped();
    const a = await prisma.assignment.findUnique({ where: { id }, select: { courseId: true } });
    if (!a) return fail(AppError.notFound("Assignment"));
    await scope.assertCourse(a.courseId);
    await assignments.deleteAssignment(id);
    revalidatePath("/instructor/assignments");
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function saveProjectAction(input: z.infer<typeof projectSchema>, id?: string): Promise<ActionResult<{ id: string }>> {
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return fail(AppError.validation(undefined, fieldErrors(parsed.error)));
  try {
    const { scope } = await scoped();
    await scope.assertCourse(parsed.data.courseId);
    const p = id ? await projects.updateProject(id, parsed.data) : await projects.createProject(parsed.data);
    revalidatePath("/instructor/projects");
    return ok({ id: p.id });
  } catch (error) {
    return fail(error);
  }
}

export async function deleteProjectAction(id: string): Promise<ActionResult<undefined>> {
  try {
    const { scope } = await scoped();
    const p = await prisma.project.findUnique({ where: { id }, select: { courseId: true } });
    if (!p) return fail(AppError.notFound("Project"));
    await scope.assertCourse(p.courseId);
    await projects.deleteProject(id);
    revalidatePath("/instructor/projects");
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function saveExamAction(input: z.infer<typeof examSchema>, id?: string): Promise<ActionResult<{ id: string }>> {
  const parsed = examSchema.safeParse(input);
  if (!parsed.success) return fail(AppError.validation(undefined, fieldErrors(parsed.error)));
  try {
    const { scope } = await scoped();
    await scope.assertCourse(parsed.data.courseId);
    const e = id ? await exams.updateExam(id, { ...parsed.data, description: parsed.data.description || undefined }) : await exams.createExam({ ...parsed.data, description: parsed.data.description || undefined });
    revalidatePath("/instructor/exams");
    return ok({ id: e.id });
  } catch (error) {
    return fail(error);
  }
}

export async function deleteExamAction(id: string): Promise<ActionResult<undefined>> {
  try {
    const { scope } = await scoped();
    const e = await prisma.exam.findUnique({ where: { id }, select: { courseId: true } });
    if (!e) return fail(AppError.notFound("Exam"));
    await scope.assertCourse(e.courseId);
    await exams.deleteExam(id);
    revalidatePath("/instructor/exams");
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function saveRubricAction(input: z.infer<typeof rubricSchema>, id?: string): Promise<ActionResult<{ id: string }>> {
  const parsed = rubricSchema.safeParse(input);
  if (!parsed.success) return fail(AppError.validation(undefined, fieldErrors(parsed.error)));
  try {
    await requirePermission("assessments.manage");
    const r = await assignments.upsertRubric({ id, ...parsed.data, criteria: parsed.data.criteria.map((c) => ({ ...c, description: c.description || undefined })) });
    return ok({ id: r.id });
  } catch (error) {
    return fail(error);
  }
}

// ───────────── Grading ─────────────

export async function gradeSubmissionAction(input: z.infer<typeof gradeSchema>, kind: "assignment" | "project"): Promise<ActionResult<undefined>> {
  const parsed = gradeSchema.safeParse(input);
  if (!parsed.success) return fail(AppError.validation(undefined, fieldErrors(parsed.error)));
  try {
    const user = await requirePermission("submissions.grade");
    const scope = await instructorScope(user);
    if (kind === "assignment") {
      const s = await prisma.assignmentSubmission.findUnique({ where: { id: parsed.data.submissionId }, select: { assignment: { select: { courseId: true } } } });
      if (!s) return fail(AppError.notFound("Submission"));
      await scope.assertCourse(s.assignment.courseId);
      await assignments.gradeSubmission({ ...parsed.data, feedback: parsed.data.feedback || undefined, rubricScores: parsed.data.rubricScores.map((r) => ({ ...r, comment: r.comment || undefined })) }, user.id);
    } else {
      const s = await prisma.projectSubmission.findUnique({ where: { id: parsed.data.submissionId }, select: { project: { select: { courseId: true } } } });
      if (!s) return fail(AppError.notFound("Submission"));
      await scope.assertCourse(s.project.courseId);
      await projects.reviewProject({ ...parsed.data, feedback: parsed.data.feedback || undefined, rubricScores: parsed.data.rubricScores.map((r) => ({ ...r, comment: r.comment || undefined })) }, user.id);
    }
    await audit({ actorId: user.id, actorRoles: user.roles, action: `${kind}.grade`, entityType: kind === "assignment" ? "AssignmentSubmission" : "ProjectSubmission", entityId: parsed.data.submissionId, after: { decision: parsed.data.decision, score: parsed.data.score } });
    revalidatePath("/instructor/submissions");
    revalidatePath("/instructor/grading");
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function gradeQuizAnswersAction(attemptId: string, grades: Array<{ questionId: string; pointsAwarded: number; graderNote?: string }>): Promise<ActionResult<undefined>> {
  try {
    const user = await requirePermission("submissions.grade");
    const scope = await instructorScope(user);
    const a = await prisma.quizAttempt.findUnique({ where: { id: attemptId }, select: { quiz: { select: { courseId: true } } } });
    if (!a) return fail(AppError.notFound("Attempt"));
    await scope.assertCourse(a.quiz.courseId);
    await quizzes.gradeManualAnswers(attemptId, grades);
    revalidatePath("/instructor/grading");
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function gradeExamAction(attemptId: string, score: number): Promise<ActionResult<undefined>> {
  try {
    const user = await requirePermission("submissions.grade");
    const scope = await instructorScope(user);
    const a = await prisma.examAttempt.findUnique({ where: { id: attemptId }, select: { exam: { select: { courseId: true } } } });
    if (!a) return fail(AppError.notFound("Attempt"));
    await scope.assertCourse(a.exam.courseId);
    await exams.gradeExamAttempt(attemptId, score, user.id);
    revalidatePath("/instructor/grading");
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

// ───────────── Delivery ─────────────

export async function markAttendanceAction(input: z.infer<typeof markAttendanceSchema>): Promise<ActionResult<undefined>> {
  const parsed = markAttendanceSchema.safeParse(input);
  if (!parsed.success) return fail(AppError.validation(undefined, fieldErrors(parsed.error)));
  try {
    const user = await requirePermission("attendance.mark");
    const scope = await instructorScope(user);
    await scope.assertBatch(parsed.data.batchId);
    await batches.markAttendance({ ...parsed.data, markedById: user.id, entries: parsed.data.entries.map((e) => ({ ...e, note: e.note || undefined })) });
    await audit({ actorId: user.id, actorRoles: user.roles, action: "attendance.mark", entityType: "Batch", entityId: parsed.data.batchId, after: { sessionDate: parsed.data.sessionDate, count: parsed.data.entries.length } });
    revalidatePath("/instructor/attendance");
    revalidatePath(`/instructor/batches/${parsed.data.batchId}`);
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function attendanceQrAction(batchId: string, sessionDate: string): Promise<ActionResult<{ token: string; url: string; qrDataUrl: string }>> {
  try {
    const user = await requirePermission("attendance.mark");
    const scope = await instructorScope(user);
    await scope.assertBatch(batchId);
    const token = batches.attendanceQrToken(batchId, sessionDate);
    const { absoluteUrl } = await import("@/lib/utils");
    const url = absoluteUrl(`/student/attendance?token=${encodeURIComponent(token)}`);
    // Rendered server-side so the attendance credential never leaves our infrastructure.
    const QRCode = (await import("qrcode")).default;
    const qrDataUrl = await QRCode.toDataURL(url, { width: 320, margin: 1 });
    return ok({ token, url, qrDataUrl });
  } catch (error) {
    return fail(error);
  }
}

export async function scheduleLiveClassAction(input: z.infer<typeof liveClassSchema>): Promise<ActionResult<{ id: string }>> {
  const parsed = liveClassSchema.safeParse(input);
  if (!parsed.success) return fail(AppError.validation(undefined, fieldErrors(parsed.error)));
  try {
    const user = await requirePermission("liveclasses.manage");
    const scope = await instructorScope(user);
    await scope.assertCourse(parsed.data.courseId);
    if (parsed.data.batchId) await scope.assertBatch(parsed.data.batchId);
    const lc = await live.scheduleLiveClass(parsed.data, user.id);
    revalidatePath("/instructor/live-classes");
    return ok({ id: lc.id });
  } catch (error) {
    return fail(error);
  }
}

export async function updateLiveClassAction(input: z.infer<typeof liveClassUpdateSchema>): Promise<ActionResult<undefined>> {
  const parsed = liveClassUpdateSchema.safeParse(input);
  if (!parsed.success) return fail(AppError.validation(undefined, fieldErrors(parsed.error)));
  try {
    const user = await requirePermission("liveclasses.manage");
    const scope = await instructorScope(user);
    const lc = await prisma.liveClass.findUnique({ where: { id: parsed.data.liveClassId }, select: { courseId: true } });
    if (!lc) return fail(AppError.notFound("Live class"));
    await scope.assertCourse(lc.courseId);
    await live.updateLiveClass(parsed.data.liveClassId, { status: parsed.data.status, notes: parsed.data.notes, recordingUrl: parsed.data.recordingUrl, recordingMediaId: parsed.data.recordingMediaId, transcript: parsed.data.transcript });
    revalidatePath("/instructor/live-classes");
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function postAnnouncementAction(input: z.infer<typeof announcementSchema>): Promise<ActionResult<{ id: string }>> {
  const parsed = announcementSchema.safeParse(input);
  if (!parsed.success) return fail(AppError.validation(undefined, fieldErrors(parsed.error)));
  try {
    const user = await requirePermission("announcements.manage");
    const scope = await instructorScope(user);
    if (parsed.data.courseId) await scope.assertCourse(parsed.data.courseId);
    if (parsed.data.batchId) await scope.assertBatch(parsed.data.batchId);
    const a = await community.postAnnouncement({ authorId: user.id, ...parsed.data });
    revalidatePath("/instructor/batches");
    return ok({ id: a.id });
  } catch (error) {
    return fail(error);
  }
}

export async function moderateAction(input: z.infer<typeof moderationSchema>): Promise<ActionResult<undefined>> {
  const parsed = moderationSchema.safeParse(input);
  if (!parsed.success) return fail(AppError.validation());
  try {
    const user = await requirePermission("community.moderate");
    await community.moderate({ actorId: user.id, ...parsed.data });
    await audit({ actorId: user.id, actorRoles: user.roles, action: `community.${parsed.data.action.toLowerCase()}`, entityType: parsed.data.replyId ? "DiscussionReply" : "Discussion", entityId: parsed.data.replyId ?? parsed.data.discussionId });
    revalidatePath("/student/community");
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

// ───────────── AI course builder ─────────────

export async function generateCourseAction(input: z.infer<typeof courseBriefSchema>): Promise<ActionResult<{ id: string }>> {
  const parsed = courseBriefSchema.safeParse(input);
  if (!parsed.success) return fail(AppError.validation(undefined, fieldErrors(parsed.error)));
  try {
    const user = await requirePermission("ai.course_builder");
    const g = await generateCourseOutline(parsed.data, user.id);
    await audit({ actorId: user.id, actorRoles: user.roles, action: "ai.course_outline", entityType: "AIGeneration", entityId: g.id, after: { courseName: parsed.data.courseName } });
    return ok({ id: g.id });
  } catch (error) {
    return fail(error);
  }
}

export async function reviewGenerationAction(id: string, decision: "APPROVED" | "REJECTED"): Promise<ActionResult<undefined>> {
  try {
    const user = await requirePermission("ai.approve");
    if (!uuid.safeParse(id).success) return fail(AppError.validation());
    await reviewGeneration(id, decision, user.id);
    await audit({ actorId: user.id, actorRoles: user.roles, action: `ai.generation.${decision.toLowerCase()}`, entityType: "AIGeneration", entityId: id });
    revalidatePath("/instructor/course-builder");
    revalidatePath("/admin/ai");
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function applyGenerationAction(id: string, options: { courseId?: string | null; categoryId?: string | null }): Promise<ActionResult<{ courseId: string }>> {
  try {
    const user = await requirePermission("ai.approve");
    const courseId = await applyGeneration(id, user.id, options);
    await audit({ actorId: user.id, actorRoles: user.roles, action: "ai.generation.apply", entityType: "AIGeneration", entityId: id, after: { courseId } });
    revalidatePath("/instructor/courses");
    revalidatePath("/admin/courses");
    return ok({ courseId });
  } catch (error) {
    return fail(error);
  }
}

// ───────────── Instructor profile (self-service) ─────────────

const instructorProfileSchema = z.object({
  title: z.string().trim().max(120).optional().or(z.literal("")),
  bio: z.string().trim().max(3000).optional().or(z.literal("")),
  expertise: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  yearsExperience: z.number().int().min(0).max(60).nullable().optional(),
  linkedinUrl: z.string().trim().url().optional().or(z.literal("")),
  websiteUrl: z.string().trim().url().optional().or(z.literal("")),
  isPublic: z.boolean().default(true),
});

export async function updateInstructorProfileAction(input: z.infer<typeof instructorProfileSchema>): Promise<ActionResult<undefined>> {
  const parsed = instructorProfileSchema.safeParse(input);
  if (!parsed.success) return fail(AppError.validation(undefined, fieldErrors(parsed.error)));
  try {
    const user = await requireUser();
    const profile = await prisma.instructorProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!profile) return fail(AppError.forbidden("You don't have an instructor profile."));
    await prisma.instructorProfile.update({ where: { id: profile.id }, data: { title: parsed.data.title || null, bio: parsed.data.bio || null, expertise: parsed.data.expertise, yearsExperience: parsed.data.yearsExperience ?? null, linkedinUrl: parsed.data.linkedinUrl || null, websiteUrl: parsed.data.websiteUrl || null, isPublic: parsed.data.isPublic } });
    const { revalidateContent } = await import("@/server/services/cms");
    revalidateContent();
    revalidatePath("/instructor/settings");
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}
