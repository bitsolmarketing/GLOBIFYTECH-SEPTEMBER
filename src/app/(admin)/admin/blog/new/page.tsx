import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/layout/page-header";
import { PostEditor } from "@/components/admin/post-editor";

export const metadata: Metadata = { title: "New post" };
export const dynamic = "force-dynamic";

export default async function NewPostPage() {
  const user = await requirePermission("cms.blog.manage");
  const categories = await prisma.blogCategory.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="New post" breadcrumbs={[{ label: "Blog", href: "/admin/blog" }, { label: "New" }]} />
      <PostEditor categories={categories} canPublish={can(user, "cms.publish")} />
    </div>
  );
}
