import type { Metadata } from "next";
import { requireUser } from "@/server/auth/session";
import { MessagesSurface } from "@/components/lms/messages-surface";

export const metadata: Metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ to?: string }> }) {
  const [{ to }, user] = await Promise.all([searchParams, requireUser()]);
  return <MessagesSurface user={user} basePath="/student/messages" to={to} />;
}
