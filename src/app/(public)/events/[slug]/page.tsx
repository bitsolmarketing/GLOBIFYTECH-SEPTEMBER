import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { prisma } from "@/server/db/prisma";
import { getSession } from "@/server/auth/session";
import { PageHero } from "@/components/marketing/page-hero";
import { EventRegisterForm } from "@/components/marketing/event-register-form";
import { JsonLd } from "@/components/seo/json-ld";
import { buildMetadata, eventJsonLd } from "@/lib/seo";
import { formatDateTime } from "@/lib/utils";
import { site } from "@/config/site";

export const revalidate = 300;

async function getEvent(slug: string) {
  return prisma.event.findFirst({ where: { slug, status: { in: ["PUBLISHED", "COMPLETED"] } }, include: { cover: true, campus: true, _count: { select: { registrations: true } } } });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const e = await getEvent(slug);
  if (!e) return {};
  return buildMetadata({ title: e.title, description: e.description?.replace(/<[^>]+>/g, "").slice(0, 160), path: `/events/${slug}`, image: e.cover?.url });
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [event, session] = await Promise.all([getEvent(slug), getSession()]);
  if (!event) notFound();
  const past = event.startsAt < new Date(Date.now() - 3 * 3600000);
  const full = !!event.capacity && event._count.registrations >= event.capacity;
  return (
    <>
      <JsonLd data={eventJsonLd(event)} />
      <PageHero eyebrow={event.isOnline ? "Online event" : "On campus"} title={event.title} crumbs={[{ label: "Events", href: "/events" }, { label: event.title }]}>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-body-sm text-fg-muted">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4" /> {formatDateTime(event.startsAt)}
            {event.endsAt ? ` – ${formatDateTime(event.endsAt)}` : ""}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4" /> {event.isOnline ? "Online (link sent after registration)" : (event.location ?? event.campus?.address ?? site.contact.address)}
          </span>
          {event.capacity ? (
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-4" /> {Math.max(0, event.capacity - event._count.registrations)} seats left
            </span>
          ) : null}
        </div>
      </PageHero>
      <div className="container-x grid gap-12 py-12 md:py-16 lg:grid-cols-12">
        <div className="lg:col-span-7">
          {event.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.cover.url} alt={event.cover.alt ?? event.title} className="mb-8 w-full rounded-2xl object-cover" />
          ) : null}
          {event.description ? <div className="prose-globify" dangerouslySetInnerHTML={{ __html: event.description }} /> : null}
        </div>
        <aside className="lg:col-span-5">
          <div className="surface sticky top-24 p-6">
            <h2 className="text-h4 mb-1">{past ? "This event has ended" : full ? "This event is full" : "Reserve your seat"}</h2>
            {!past && !full ? (
              <>
                <p className="mb-4 text-body-sm text-fg-muted">Free to attend. We'll send a reminder before it starts.</p>
                <EventRegisterForm eventId={event.id} defaults={session ? { name: session.name, email: session.email } : undefined} />
              </>
            ) : (
              <p className="text-body-sm text-fg-muted">{past ? "Browse upcoming events for the next open day." : "Join the waitlist by contacting admissions."}</p>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
