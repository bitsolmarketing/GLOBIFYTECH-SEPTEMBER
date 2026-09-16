import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/session";
import { getPostForEditing } from "@/server/services/cms";
import { prisma } from "@/server/db/prisma";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/layout/page-header";
import { PostEditor } from "@/components/admin/post-editor";
import { Badge, statusVariant } from "@/components/ui/badge";
import { enumLabel, relativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Edit post" };
export const dynamic = "force-dynamic";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requirePermission("cms.blog.manage")]);
  const [post, categories] = await Promise.all([getPostForEditing(id), prisma.blogCategory.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader breadcrumbs={[{ label: "Blog", href: "/admin/blog" }, { label: post.title }]} title={post.title} description={`Updated ${relativeTime(post.updatedAt)}`} actions={<Badge variant={statusVariant(post.status)}>{enumLabel(post.status)}</Badge>} />
      <PostEditor
        id={post.id}
        categories={categories}
        canPublish={can(user, "cms.publish")}
        initial={{ title: post.title, slug: post.slug, excerpt: post.excerpt ?? "", content: post.content ?? "", categoryId: post.categoryId ?? "", tagNames: post.tags.map((t) => t.tag.name), status: post.status, scheduledAt: post.scheduledAt ? post.scheduledAt.toISOString().slice(0, 16) : "", seoTitle: post.seoTitle ?? "", seoDescription: post.seoDescription ?? "", canonicalUrl: post.canonicalUrl ?? "", noindex: post.noindex }}
      />
    </div>
  );
}
