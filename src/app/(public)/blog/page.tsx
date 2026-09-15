import type { Metadata } from "next";
import Link from "next/link";
import { listPublishedPosts } from "@/server/services/cms";
import { prisma } from "@/server/db/prisma";
import { PageHero } from "@/components/marketing/page-hero";
import { BlogCard } from "@/components/marketing/sections/misc";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { buildMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const revalidate = 300;
export const metadata: Metadata = buildMetadata({ title: "Blog", description: "Practical guides on AI, marketing, development, design, automation and freelancing from Globify Tech instructors.", path: "/blog" });

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ page?: string; category?: string; tag?: string; q?: string }> }) {
  const sp = await searchParams;
  const [{ items, total, page, pageSize }, categories] = await Promise.all([
    listPublishedPosts({ page: Number(sp.page ?? 1) || 1, category: sp.category, tag: sp.tag, q: sp.q }),
    prisma.blogCategory.findMany({ where: { posts: { some: { status: "PUBLISHED", deletedAt: null } } }, orderBy: { name: "asc" } }),
  ]);
  return (
    <>
      <PageHero eyebrow="Blog" title="Practical guides from people who do the work." description="No fluff. Tactics, playbooks and teardowns from our instructors and graduates." crumbs={[{ label: "Home", href: "/" }, { label: "Blog" }]}>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link href="/blog">
            <Badge variant={!sp.category ? "accent" : "outline"} className="px-3 py-1 text-sm">All</Badge>
          </Link>
          {categories.map((c) => (
            <Link key={c.id} href={`/blog?category=${c.slug}`}>
              <Badge variant={sp.category === c.slug ? "accent" : "outline"} className={cn("px-3 py-1 text-sm")}>{c.name}</Badge>
            </Link>
          ))}
        </div>
      </PageHero>
      <div className="container-x py-12 md:py-16">
        {items.length ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => (
              <BlogCard key={p.id} post={p} />
            ))}
          </div>
        ) : (
          <EmptyState title="No articles yet." description="New posts are published every week." />
        )}
        <Pagination className="mt-10" page={page} pageSize={pageSize} total={total} hrefFor={(p) => `/blog?${new URLSearchParams({ ...(sp.category ? { category: sp.category } : {}), ...(sp.tag ? { tag: sp.tag } : {}), page: String(p) }).toString()}`} />
      </div>
    </>
  );
}
