import type { Metadata } from "next";
import Link from "next/link";
import { LayoutTemplate, Newspaper, ImageIcon, CalendarDays, Quote, ArrowRight } from "lucide-react";
import { requirePermission } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/layout/page-header";
import { NavigationManager, FaqManager } from "./cms-managers";

export const metadata: Metadata = { title: "Website" };
export const dynamic = "force-dynamic";

export default async function CmsHubPage() {
  const user = await requirePermission("cms.content.manage");
  const [navigations, faqs, counts] = await Promise.all([
    prisma.navigation.findMany({ orderBy: { key: "asc" }, include: { items: { orderBy: { order: "asc" } } } }),
    prisma.faq.findMany({ orderBy: [{ group: "asc" }, { order: "asc" }] }),
    Promise.all([
      prisma.page.count({ where: { deletedAt: null } }),
      prisma.blogPost.count({ where: { deletedAt: null } }),
      prisma.media.count({ where: { deletedAt: null } }),
      prisma.event.count(),
      prisma.testimonial.count(),
    ]),
  ]);
  const [pages, posts, media, events, testimonials] = counts;
  const tiles = [
    { href: "/admin/pages", icon: LayoutTemplate, label: "Pages", value: pages, hint: "Sections, SEO and publishing" },
    { href: "/admin/blog", icon: Newspaper, label: "Blog", value: posts, hint: "Articles and categories" },
    { href: "/admin/media", icon: ImageIcon, label: "Media", value: media, hint: "Images, video and documents" },
    { href: "/admin/events", icon: CalendarDays, label: "Events", value: events, hint: "Open days and webinars" },
    { href: "/admin/testimonials", icon: Quote, label: "Testimonials", value: testimonials, hint: "Quotes and success stories" },
  ];
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Website" description="Everything the public site shows, editable without a deploy." />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className="surface surface-hover flex flex-col gap-1 p-4">
            <t.icon className="size-5 text-accent" />
            <span className="text-h3 tabular-nums">{t.value}</span>
            <span className="text-sm font-medium">{t.label}</span>
            <span className="text-caption text-fg-muted">{t.hint}</span>
            <ArrowRight className="mt-1 size-4 text-fg-subtle" />
          </Link>
        ))}
      </section>
      {can(user, "cms.navigation.manage") ? <NavigationManager navigations={navigations.map((n) => ({ id: n.id, key: n.key, name: n.name, items: n.items.map((i) => ({ id: i.id, label: i.label, href: i.href, description: i.description ?? "", order: i.order, openInNewTab: i.openInNewTab, isVisible: i.isVisible, parentId: i.parentId })) }))} /> : null}
      <FaqManager faqs={faqs.map((f) => ({ id: f.id, question: f.question, answer: f.answer, group: f.group, order: f.order, isVisible: f.isVisible }))} />
    </div>
  );
}
