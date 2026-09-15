import "server-only";
import { prisma } from "@/server/db/prisma";
import { can, type Permission } from "@/lib/rbac";
import type { SessionUser } from "@/server/auth/session";

export interface SearchHit {
  id: string;
  type: "student" | "course" | "lesson" | "application" | "lead" | "invoice" | "certificate" | "blog" | "page" | "instructor" | "batch";
  title: string;
  subtitle?: string;
  href: string;
}

export interface SearchProvider {
  search(query: string, user: SessionUser, limit?: number): Promise<SearchHit[]>;
}

/**
 * PostgreSQL search provider. Uses ILIKE + trigram-friendly patterns per entity
 * and applies the caller's permissions so results never leak across roles.
 * Swap for an OpenSearch provider by implementing `SearchProvider`.
 */
class PostgresSearchProvider implements SearchProvider {
  async search(query: string, user: SessionUser, limit = 8): Promise<SearchHit[]> {
    const q = query.trim();
    if (q.length < 2) return [];
    const like = { contains: q, mode: "insensitive" as const };
    const tasks: Array<Promise<SearchHit[]>> = [];
    const allowed = (p: Permission) => can(user, p);
    const isStudent = user.roles.includes("STUDENT") || user.roles.includes("ALUMNI");
    const isInstructor = user.roles.includes("INSTRUCTOR") || user.roles.includes("TEACHING_ASSISTANT");

    // Courses: everyone sees published; staff sees drafts too.
    tasks.push(
      prisma.course
        .findMany({
          where: { deletedAt: null, ...(allowed("courses.read") ? {} : { status: "PUBLISHED" }), OR: [{ title: like }, { subtitle: like }, { slug: like }] },
          take: limit,
          select: { id: true, slug: true, title: true, subtitle: true, status: true },
        })
        .then((rows) =>
          rows.map((c) => ({
            id: c.id,
            type: "course" as const,
            title: c.title,
            subtitle: c.subtitle ?? c.status,
            href: allowed("courses.read") ? `/admin/courses/${c.id}` : isInstructor ? `/instructor/course/${c.id}` : isStudent ? `/student/course/${c.id}` : `/courses/${c.slug}`,
          })),
        ),
    );

    if (allowed("students.read")) {
      tasks.push(
        prisma.studentProfile
          .findMany({
            where: { user: { OR: [{ name: like }, { email: like }, { phone: like }] } },
            take: limit,
            select: { id: true, studentNumber: true, user: { select: { name: true, email: true } } },
          })
          .then((rows) => rows.map((s) => ({ id: s.id, type: "student" as const, title: s.user.name, subtitle: `${s.studentNumber} · ${s.user.email}`, href: allowed("students.update") ? `/admin/students/${s.id}` : `/instructor/students/${s.id}` }))),
      );
    }
    if (allowed("crm.leads.read")) {
      tasks.push(
        prisma.lead
          .findMany({ where: { deletedAt: null, OR: [{ name: like }, { phone: like }, { email: like }, { city: like }] }, take: limit, select: { id: true, name: true, phone: true, stage: true } })
          .then((rows) => rows.map((l) => ({ id: l.id, type: "lead" as const, title: l.name, subtitle: `${l.stage} · ${l.phone ?? ""}`, href: `/admin/leads/${l.id}` }))),
      );
    }
    if (allowed("applications.read")) {
      tasks.push(
        prisma.application
          .findMany({ where: { OR: [{ number: like }, { applicant: { name: like } }, { applicant: { email: like } }] }, take: limit, select: { id: true, number: true, status: true, applicant: { select: { name: true } }, course: { select: { title: true } } } })
          .then((rows) => rows.map((a) => ({ id: a.id, type: "application" as const, title: a.applicant?.name ?? a.number, subtitle: `${a.number} · ${a.course.title} · ${a.status}`, href: `/admin/applications/${a.id}` }))),
      );
    }
    if (allowed("payments.read")) {
      tasks.push(
        prisma.invoice
          .findMany({ where: { deletedAt: null, OR: [{ number: like }, { student: { user: { name: like } } }] }, take: limit, select: { id: true, number: true, status: true, total: true, student: { select: { user: { select: { name: true } } } } } })
          .then((rows) => rows.map((i) => ({ id: i.id, type: "invoice" as const, title: i.number, subtitle: `${i.student.user.name} · ${i.status}`, href: `/admin/invoices/${i.id}` }))),
      );
    }
    if (allowed("certificates.read")) {
      tasks.push(
        prisma.certificate
          .findMany({ where: { OR: [{ certificateNumber: like }, { student: { user: { name: like } } }] }, take: limit, select: { id: true, certificateNumber: true, status: true, title: true } })
          .then((rows) => rows.map((c) => ({ id: c.id, type: "certificate" as const, title: c.certificateNumber, subtitle: `${c.title} · ${c.status}`, href: `/admin/certificates/${c.id}` }))),
      );
    }
    if (allowed("cms.blog.manage")) {
      tasks.push(
        prisma.blogPost
          .findMany({ where: { deletedAt: null, OR: [{ title: like }, { slug: like }] }, take: limit, select: { id: true, title: true, status: true } })
          .then((rows) => rows.map((p) => ({ id: p.id, type: "blog" as const, title: p.title, subtitle: p.status, href: `/admin/blog/${p.id}` }))),
      );
    }
    if (allowed("cms.pages.manage")) {
      tasks.push(
        prisma.page
          .findMany({ where: { deletedAt: null, OR: [{ title: like }, { slug: like }] }, take: limit, select: { id: true, title: true, slug: true } })
          .then((rows) => rows.map((p) => ({ id: p.id, type: "page" as const, title: p.title, subtitle: `/${p.slug}`, href: `/admin/pages/${p.id}` }))),
      );
    }
    if (allowed("batches.read")) {
      tasks.push(
        prisma.batch
          .findMany({ where: { deletedAt: null, OR: [{ code: like }, { name: like }] }, take: limit, select: { id: true, code: true, name: true, status: true } })
          .then((rows) => rows.map((b) => ({ id: b.id, type: "batch" as const, title: b.name, subtitle: `${b.code} · ${b.status}`, href: allowed("batches.manage") ? `/admin/batches/${b.id}` : `/instructor/batches/${b.id}` }))),
      );
    }
    if (isStudent) {
      const student = await prisma.studentProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
      if (student) {
        tasks.push(
          prisma.lesson
            .findMany({
              where: { title: like, unit: { module: { course: { enrollments: { some: { studentId: student.id } } } } } },
              take: limit,
              select: { id: true, title: true, unit: { select: { module: { select: { courseId: true, course: { select: { title: true } } } } } } },
            })
            .then((rows) => rows.map((l) => ({ id: l.id, type: "lesson" as const, title: l.title, subtitle: l.unit.module.course.title, href: `/student/course/${l.unit.module.courseId}?lesson=${l.id}` }))),
        );
      }
    }

    const results = (await Promise.all(tasks)).flat();
    return results.slice(0, limit * 3);
  }
}

let provider: SearchProvider | undefined;
export function searchProvider(): SearchProvider {
  provider ??= new PostgresSearchProvider();
  return provider;
}
