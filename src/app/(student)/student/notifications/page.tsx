import type { Metadata } from "next";
import { requireUser } from "@/server/auth/session";
import { listInApp } from "@/server/services/notifications";
import { PageHeader } from "@/components/layout/page-header";
import { NotificationsList } from "@/components/lms/notifications-list";

export const metadata: Metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await listInApp(user.id, 50);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Notifications" />
      <NotificationsList items={items.map((n) => ({ id: n.id, event: n.event, title: n.title, body: n.body, href: n.href, readAt: n.readAt?.toISOString() ?? null, createdAt: n.createdAt.toISOString() }))} />
    </div>
  );
}
