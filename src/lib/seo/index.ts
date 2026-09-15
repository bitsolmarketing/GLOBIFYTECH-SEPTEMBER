import type { Metadata } from "next";
import { site } from "@/config/site";
import { absoluteUrl } from "@/lib/utils";

export interface SeoInput {
  title: string;
  description?: string | null;
  path: string;
  image?: string | null;
  noindex?: boolean;
  canonical?: string | null;
  type?: "website" | "article";
  publishedTime?: Date | null;
  authors?: string[];
}

export function buildMetadata(input: SeoInput): Metadata {
  const url = input.canonical || absoluteUrl(input.path);
  const description = input.description ?? site.description;
  const image = input.image ?? absoluteUrl("/opengraph-image");
  return {
    title: input.title,
    description,
    alternates: { canonical: url },
    robots: input.noindex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title: input.title,
      description,
      url,
      siteName: site.name,
      type: input.type ?? "website",
      images: [{ url: image, width: 1200, height: 630, alt: input.title }],
      ...(input.publishedTime ? { publishedTime: input.publishedTime.toISOString() } : {}),
    },
    twitter: { card: "summary_large_image", title: input.title, description, images: [image] },
  };
}

type JsonLd = Record<string, unknown>;

export function organizationJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: site.legalName,
    alternateName: site.name,
    url: site.url,
    logo: absoluteUrl("/icon.svg"),
    foundingDate: String(site.foundedYear),
    slogan: site.tagline,
    address: { "@type": "PostalAddress", streetAddress: "2nd Floor, Kohinoor Plaza, Jaranwala Road", addressLocality: "Faisalabad", addressRegion: "Punjab", postalCode: "38000", addressCountry: "PK" },
    contactPoint: [{ "@type": "ContactPoint", telephone: site.contact.admissionsPhone, contactType: "admissions", availableLanguage: ["en", "ur"] }],
    sameAs: Object.values(site.social),
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: absoluteUrl(item.path) })),
  };
}

export function courseJsonLd(course: { title: string; description?: string | null; slug: string; price?: number | string | null; currency?: string; instructors?: string[]; ratingAvg?: number; ratingCount?: number; durationWeeks?: number | null; mode?: string }): JsonLd {
  const mode = course.mode === "ON_CAMPUS" ? "Onsite" : course.mode === "SELF_PACED" || course.mode === "LIVE_ONLINE" ? "Online" : "Blended";
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.description ?? undefined,
    url: absoluteUrl(`/courses/${course.slug}`),
    provider: { "@type": "EducationalOrganization", name: site.legalName, url: site.url },
    ...(course.instructors?.length ? { instructor: course.instructors.map((name) => ({ "@type": "Person", name })) } : {}),
    ...(course.ratingCount ? { aggregateRating: { "@type": "AggregateRating", ratingValue: course.ratingAvg, ratingCount: course.ratingCount } } : {}),
    offers: { "@type": "Offer", price: course.price ?? 0, priceCurrency: course.currency ?? "PKR", availability: "https://schema.org/InStock", category: "Paid" },
    hasCourseInstance: [{ "@type": "CourseInstance", courseMode: mode, ...(course.durationWeeks ? { courseWorkload: `P${course.durationWeeks}W` } : {}) }],
  };
}

export function articleJsonLd(post: { title: string; excerpt?: string | null; slug: string; publishedAt?: Date | null; updatedAt?: Date; author?: string | null; image?: string | null }): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt ?? undefined,
    url: absoluteUrl(`/blog/${post.slug}`),
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt?.toISOString(),
    author: post.author ? { "@type": "Person", name: post.author } : { "@type": "Organization", name: site.name },
    publisher: { "@type": "Organization", name: site.name, logo: { "@type": "ImageObject", url: absoluteUrl("/icon.svg") } },
    ...(post.image ? { image: [post.image] } : {}),
  };
}

export function faqJsonLd(items: Array<{ question: string; answer: string }>): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
  };
}

export function eventJsonLd(event: { title: string; description?: string | null; slug: string; startsAt: Date; endsAt?: Date | null; location?: string | null; isOnline: boolean }): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description ?? undefined,
    url: absoluteUrl(`/events/${event.slug}`),
    startDate: event.startsAt.toISOString(),
    endDate: event.endsAt?.toISOString(),
    eventAttendanceMode: event.isOnline ? "https://schema.org/OnlineEventAttendanceMode" : "https://schema.org/OfflineEventAttendanceMode",
    location: event.isOnline ? { "@type": "VirtualLocation", url: absoluteUrl(`/events/${event.slug}`) } : { "@type": "Place", name: event.location ?? site.contact.address, address: site.contact.address },
    organizer: { "@type": "Organization", name: site.name, url: site.url },
  };
}
