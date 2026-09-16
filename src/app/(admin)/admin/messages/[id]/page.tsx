import type { Metadata } from "next";
import { requireUser } from "@/server/auth/session";
import { MessagesSurface } from "@/components/lms/messages-surface";

export const metadata: Metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

export default async function AdminConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);
  return <MessagesSurface user={user} basePath="/admin/messages" activeId={id} />;
}
