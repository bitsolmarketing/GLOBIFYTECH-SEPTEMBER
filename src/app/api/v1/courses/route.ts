import { handle, jsonOk } from "@/lib/api/respond";
import { listPublishedCourses, getCatalogFacets } from "@/server/services/courses";
import { toNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** GET /api/v1/courses — public catalogue for the mobile app. */
export const GET = handle(async (req) => {
  const p = new URL(req.url).searchParams;
  const [result, facets] = await Promise.all([
    listPublishedCourses({
      q: p.get("q") ?? undefined,
      category: p.get("category") ?? undefined,
      skill: p.get("skill") ?? undefined,
      level: (p.get("level") as "BEGINNER") ?? undefined,
      mode: (p.get("mode") as "HYBRID") ?? undefined,
      sort: (p.get("sort") as "popular") ?? undefined,
      page: Number(p.get("page") ?? 1) || 1,
      pageSize: Math.min(50, Number(p.get("pageSize") ?? 12) || 12),
    }),
    p.get("facets") === "1" ? getCatalogFacets() : null,
  ]);
  return jsonOk(
    result.items.map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      subtitle: c.subtitle,
      shortDescription: c.shortDescription,
      level: c.level,
      mode: c.mode,
      durationWeeks: c.durationWeeks,
      price: toNumber(c.price),
      discountPrice: c.discountPrice ? toNumber(c.discountPrice) : null,
      currency: c.currency,
      rating: toNumber(c.ratingAvg),
      ratingCount: c.ratingCount,
      studentCount: c.studentCount,
      artwork: c.artwork?.url ?? null,
      artworkKey: c.category?.artworkKey ?? null,
      category: c.category ? { id: c.category.id, slug: c.category.slug, name: c.category.name } : null,
      instructors: c.instructors.map((i) => ({ id: i.instructor.id, name: i.instructor.user.name, title: i.instructor.title, avatar: i.instructor.user.avatar?.url ?? null })),
      skills: c.skills.map((s) => s.skill.name),
    })),
    { page: result.page, pageSize: result.pageSize, total: result.total, ...(facets ? { facets } : {}) },
  );
});
