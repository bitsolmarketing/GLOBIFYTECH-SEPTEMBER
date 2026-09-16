import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { CATEGORY_ARTWORK } from "@/config/site";
import { PageHeader } from "@/components/layout/page-header";
import { CategoryManager } from "./category-manager";

export const metadata: Metadata = { title: "Categories" };
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  await requirePermission("categories.manage");
  const categories = await prisma.category.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }], include: { _count: { select: { courses: true, children: true } }, parent: { select: { id: true, name: true } } } });
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Categories" description="Catalogue structure used by the public marketplace, filters and course artwork." />
      <CategoryManager
        artworkKeys={Object.keys(CATEGORY_ARTWORK)}
        categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug, description: c.description ?? "", artworkKey: c.artworkKey, order: c.order, parentId: c.parentId, parentName: c.parent?.name ?? null, isActive: c.isActive, courses: c._count.courses, children: c._count.children }))}
      />
    </div>
  );
}
