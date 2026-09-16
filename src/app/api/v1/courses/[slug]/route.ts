import { handle, jsonOk } from "@/lib/api/respond";
import { getPublicCourseBySlug } from "@/server/services/courses";
import { AppError } from "@/server/errors";
import { toNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** GET /api/v1/courses/:slug — full public course detail for the mobile app. */
export const GET = handle(async (_req: Request, ctx: { params: Promise<{ slug: string }> }) => {
  const { slug } = await ctx.params;
  const c = await getPublicCourseBySlug(slug);
  if (!c) throw AppError.notFound("Course");
  return jsonOk({
    id: c.id,
    slug: c.slug,
    title: c.title,
    subtitle: c.subtitle,
    description: c.description,
    shortDescription: c.shortDescription,
    outcomes: c.outcomes,
    prerequisites: c.prerequisites,
    level: c.level,
    mode: c.mode,
    language: c.language,
    durationWeeks: c.durationWeeks,
    hoursPerWeek: c.hoursPerWeek,
    price: toNumber(c.price),
    discountPrice: c.discountPrice ? toNumber(c.discountPrice) : null,
    currency: c.currency,
    rating: toNumber(c.ratingAvg),
    ratingCount: c.ratingCount,
    studentCount: c.studentCount,
    artwork: c.artwork?.url ?? null,
    artworkKey: c.category?.artworkKey ?? null,
    promoVideo: c.promoVideo?.url ?? null,
    category: c.category ? { id: c.category.id, slug: c.category.slug, name: c.category.name } : null,
    skills: c.skills.map((s) => ({ id: s.skill.id, name: s.skill.name })),
    instructors: c.instructors.map((i) => ({ id: i.instructor.id, slug: i.instructor.slug, name: i.instructor.user.name, title: i.instructor.title, avatar: i.instructor.user.avatar?.url ?? null, isLead: i.isLead })),
    curriculum: c.modules.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      units: m.units.map((u) => ({ id: u.id, title: u.title, lessons: u.lessons.map((l) => ({ id: l.id, title: l.title, type: l.type, durationSeconds: l.durationSeconds, isPreview: l.isPreview })) })),
    })),
    projects: c.projects.map((p) => ({ id: p.id, title: p.title, overview: p.overview, skills: p.skills })),
    reviews: c.reviews.map((r) => ({ id: r.id, rating: r.rating, title: r.title, body: r.body, author: r.student.user.name, avatar: r.student.user.avatar?.url ?? null, createdAt: r.createdAt })),
    feePlans: c.feePlans.map((f) => ({ id: f.id, name: f.name, total: toNumber(f.totalAmount), currency: f.currency, isDefault: f.isDefault, installments: f.installments.map((i) => ({ label: i.label, amount: toNumber(i.amount), dueAfterDays: i.dueAfterDays })) })),
    batches: c.batches.map((b) => ({ id: b.id, code: b.code, name: b.name, mode: b.mode, startDate: b.startDate, seatsLeft: Math.max(0, b.capacity - b._count.students), campus: b.campus ? { name: b.campus.name, city: b.campus.city } : null, schedule: b.schedule.map((s) => ({ dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime })) })),
  });
});
