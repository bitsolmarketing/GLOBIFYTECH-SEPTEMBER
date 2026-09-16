import type { Metadata } from "next";
import { prisma } from "@/server/db/prisma";
import { PageHero } from "@/components/marketing/page-hero";
import { EventsSection } from "@/components/marketing/sections/misc";
import { EmptyState } from "@/components/ui/empty-state";
import { buildMetadata } from "@/lib/seo";
import { daysAgo } from "@/lib/utils";

export const revalidate = 300;
export const metadata: Metadata = buildMetadata({ title: "Events", description: "Open days, workshops, webinars and demo days at Globify Tech, Faisalabad and online.", path: "/events" });

export default async function EventsPage() {
  const [upcoming, past] = await Promise.all([
    prisma.event.findMany({ where: { status: "PUBLISHED", startsAt: { gte: daysAgo(1) } }, orderBy: { startsAt: "asc" }, take: 30, include: { cover: { select: { url: true, alt: true } }, campus: { select: { city: true } } } }),
    prisma.event.findMany({ where: { status: { in: ["PUBLISHED", "COMPLETED"] }, startsAt: { lt: daysAgo(1) } }, orderBy: { startsAt: "desc" }, take: 6, include: { cover: { select: { url: true, alt: true } }, campus: { select: { city: true } } } }),
  ]);
  return (
    <>
      <PageHero eyebrow="Events" title="Open days, workshops and demo days." description="Meet instructors, see student work, and try a class before you enroll." crumbs={[{ label: "Home", href: "/" }, { label: "Events" }]} />
      {upcoming.length ? <EventsSection data={{ title: "Upcoming" }} events={upcoming} /> : <div className="container-x py-16"><EmptyState title="No upcoming events right now." description="Follow us on social media to hear about the next open day." /></div>}
      {past.length ? <EventsSection data={{ title: "Past events" }} events={past} /> : null}
    </>
  );
}
