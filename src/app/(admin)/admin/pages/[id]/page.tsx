import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requirePermission } from "@/server/auth/session";
import { getPageForEditing } from "@/server/services/cms";
import { prisma } from "@/server/db/prisma";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge, statusVariant } from "@/components/ui/badge";
import { PageBuilder } from "./page-builder";
import { enumLabel, relativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Edit page" };
export const dynamic = "force-dynamic";

export default async function EditPagePage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requirePermission("cms.pages.manage")]);
  const [page, categories, courses] = await Promise.all([
    getPageForEditing(id),
    prisma.category.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { order: "asc" } }),
    prisma.course.findMany({ where: { deletedAt: null, status: "PUBLISHED" }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
  ]);
  const href = page.slug === "home" ? "/" : `/${page.slug}`;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Pages", href: "/admin/pages" }, { label: page.title }]}
        title={page.title}
        description={`${href} · updated ${relativeTime(page.updatedAt)}`}
        actions={<div className="flex items-center gap-2"><Badge variant={statusVariant(page.status)}>{enumLabel(page.status)}</Badge>{page.status === "PUBLISHED" ? <Button asChild variant="outline" size="sm"><Link href={href} target="_blank"><ExternalLink /> View live</Link></Button> : null}</div>}
      />
      <PageBuilder
        canPublish={can(user, "cms.publish")}
        page={{ id: page.id, title: page.title, slug: page.slug, locale: page.locale, status: page.status, seoTitle: page.seoTitle ?? "", seoDescription: page.seoDescription ?? "", canonicalUrl: page.canonicalUrl ?? "", noindex: page.noindex, scheduledAt: page.scheduledAt ? page.scheduledAt.toISOString().slice(0, 16) : "" }}
        sections={page.sections.map((s) => ({ id: s.id, type: s.type, name: s.name ?? "", data: (s.data ?? {}) as Record<string, unknown>, isVisible: s.isVisible, order: s.order }))}
        categories={categories}
        courses={courses}
      />
    </div>
  );
}
