import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { SearchX } from "lucide-react";
import { listPublishedCourses, getCatalogFacets, type CatalogFilters } from "@/server/services/courses";
import { CourseCard } from "@/components/lms/course-card";
import { CourseFilters } from "@/components/marketing/course-filters";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import Link from "next/link";

export const revalidate = 120;

export const metadata: Metadata = buildMetadata({ title: "Courses", description: "Practical, project-first courses in AI, marketing, development, design, automation and freelancing. On-campus in Faisalabad or live online.", path: "/courses" });

type Search = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function CoursesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const t = await getTranslations("courses");
  const filters: CatalogFilters = {
    q: first(sp.q),
    category: first(sp.category) === "__all" ? undefined : first(sp.category),
    skill: first(sp.skill),
    level: first(sp.level) as CatalogFilters["level"],
    mode: first(sp.mode) as CatalogFilters["mode"],
    duration: first(sp.duration) as CatalogFilters["duration"],
    instructor: first(sp.instructor),
    sort: first(sp.sort) as CatalogFilters["sort"],
    page: Number(first(sp.page) ?? 1) || 1,
    pageSize: 12,
  };
  const [{ items, total, page, pageSize }, facets] = await Promise.all([listPublishedCourses(filters), getCatalogFacets()]);
  const qs = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (v && k !== "page" ? [[k, String(Array.isArray(v) ? v[0] : v)]] : [])));

  return (
    <div className="container-x py-12 md:py-16">
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Courses", path: "/courses" }])} />
      <div className="mb-8 flex max-w-2xl flex-col gap-3">
        <p className="text-label text-accent">{t("title")}</p>
        <h1 className="text-h1 text-fg">{t("searchPlaceholder")}</h1>
        <p className="text-body-lg text-fg-muted">Every course is hands-on, taught by practitioners, and ends with work you can show.</p>
      </div>
      <Suspense>
        <CourseFilters
          categories={facets.categories.map((c) => ({ value: c.slug, label: c.name }))}
          skills={facets.skills.map((s) => ({ value: s.slug, label: s.name }))}
          instructors={facets.instructors.map((i) => ({ value: i.slug, label: i.user.name }))}
          labels={{ search: t("searchPlaceholder"), category: t("category"), skill: t("skill"), difficulty: t("difficulty"), duration: t("duration"), mode: t("mode"), instructor: t("instructor"), clear: t("clearFilters"), filter: "Filters", results: "Show results" }}
        />
      </Suspense>
      <p className="mt-6 text-body-sm text-fg-muted" aria-live="polite">
        {t("results", { count: total })}
      </p>
      {items.length ? (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      ) : (
        <EmptyState
          className="mt-6"
          icon={<SearchX />}
          title={t("empty")}
          action={
            <Button asChild variant="secondary">
              <Link href="/courses">{t("clearFilters")}</Link>
            </Button>
          }
        />
      )}
      <Pagination className="mt-10" page={page} pageSize={pageSize} total={total} hrefFor={(p) => `/courses?${new URLSearchParams({ ...Object.fromEntries(qs), page: String(p) }).toString()}`} />
    </div>
  );
}
