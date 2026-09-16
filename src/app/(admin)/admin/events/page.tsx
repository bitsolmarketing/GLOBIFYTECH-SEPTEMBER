import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { EventManager } from "./event-manager";

export const metadata: Metadata = { title: "Events" };
export const dynamic = "force-dynamic";

export default async function EventsPage() {
  await requirePermission("cms.content.manage");
  const [events, campuses] = await Promise.all([
    prisma.event.findMany({ orderBy: { startsAt: "desc" }, include: { campus: { select: { name: true } }, _count: { select: { registrations: true } } } }),
    prisma.campus.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Events" description="Open days, workshops and webinars. Registrations are captured on the public site." />
      <EventManager
        campuses={campuses}
        events={events.map((e) => ({ id: e.id, title: e.title, slug: e.slug, description: e.description ?? "", startsAt: e.startsAt.toISOString().slice(0, 16), endsAt: e.endsAt ? e.endsAt.toISOString().slice(0, 16) : "", location: e.location ?? "", isOnline: e.isOnline, meetingUrl: e.meetingUrl ?? "", capacity: e.capacity, campusId: e.campusId, campusName: e.campus?.name ?? null, status: e.status, registrations: e._count.registrations }))}
      />
    </div>
  );
}
