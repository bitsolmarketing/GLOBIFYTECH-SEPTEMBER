import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedPost, getRecentPosts } from "@/server/services/cms";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { BlogCard } from "@/components/marketing/sections/misc";
import { JsonLd } from "@/components/seo/json-ld";
import { articleJsonLd, breadcrumbJsonLd, buildMetadata } from "@/lib/seo";
import { formatDate } from "@/lib/utils";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return {};
  return buildMetadata({ title: post.seoTitle ?? post.title, description: post.seoDescription ?? post.excerpt, path: `/blog/${slug}`, image: post.ogImage?.url ?? post.featured?.url, noindex: post.noindex, canonical: post.canonicalUrl, type: "article", publishedTime: post.publishedAt });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) notFound();
  const related = (await getRecentPosts(4)).filter((p) => p.id !== post.id).slice(0, 3);
  return (
    <article className="py-12 md:py-16">
      <JsonLd data={[articleJsonLd({ ...post, author: post.author?.name, image: post.featured?.url }), breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Blog", path: "/blog" }, { name: post.title, path: `/blog/${post.slug}` }])]} />
      <div className="container-x max-w-3xl">
        <Breadcrumbs items={[{ label: "Blog", href: "/blog" }, ...(post.category ? [{ label: post.category.name, href: `/blog?category=${post.category.slug}` }] : []), { label: post.title }]} />
        <header className="mt-6 flex flex-col gap-4">
          {post.category ? <p className="text-label text-accent">{post.category.name}</p> : null}
          <h1 className="text-h1 text-fg">{post.title}</h1>
          {post.excerpt ? <p className="text-body-lg text-fg-muted">{post.excerpt}</p> : null}
          <div className="flex flex-wrap items-center gap-3 text-body-sm text-fg-muted">
            {post.author ? (
              <span className="inline-flex items-center gap-2">
                <Avatar name={post.author.name} src={post.author.avatar?.url} size="sm" />
                {post.author.instructorProfile ? <Link href={`/instructors/${post.author.instructorProfile.slug}`} className="font-medium text-fg hover:text-accent">{post.author.name}</Link> : <span className="font-medium text-fg">{post.author.name}</span>}
              </span>
            ) : null}
            <span>· {formatDate(post.publishedAt)}</span>
            {post.readingMinutes ? <span>· {post.readingMinutes} min read</span> : null}
          </div>
        </header>
        {post.featured ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.featured.url} alt={post.featured.alt ?? post.title} className="mt-8 aspect-[16/9] w-full rounded-2xl object-cover" />
        ) : null}
        <div className="prose-globify mt-10" dangerouslySetInnerHTML={{ __html: post.content ?? "" }} />
        {post.tags.length ? (
          <div className="mt-10 flex flex-wrap gap-2 border-t border-border pt-6">
            {post.tags.map(({ tag }) => (
              <Link key={tag.id} href={`/blog?tag=${tag.slug}`}>
                <Badge variant="outline" className="hover:border-accent hover:text-accent">#{tag.name}</Badge>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
      {related.length ? (
        <div className="container-x mt-16">
          <h2 className="text-h3 mb-5">Keep reading</h2>
          <div className="grid gap-5 md:grid-cols-3">
            {related.map((p) => (
              <BlogCard key={p.id} post={p} />
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}
