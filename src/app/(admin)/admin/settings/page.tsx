import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/session";
import { getSettings, SETTING_DEFAULTS } from "@/server/services/settings";
import { prisma } from "@/server/db/prisma";
import { env } from "@/config/env";
import { isAiConfigured } from "@/server/ai/provider";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { SettingsForm, CampusManager } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

const GROUPS: Record<string, { label: string; description: string }> = {
  institute: { label: "Institute", description: "Identity used across emails, invoices and certificates." },
  attendance: { label: "Attendance", description: "Thresholds that trigger warnings and success-engine signals." },
  completion: { label: "Completion & certificates", description: "Defaults for course completion rules." },
  certificates: { label: "Certificate design", description: "Signatory and numbering." },
  finance: { label: "Finance", description: "Invoice due dates and reminder timing." },
  risk: { label: "Student success engine", description: "Inactivity windows for risk scoring." },
  gamification: { label: "Gamification", description: "Points, badges and streaks." },
  community: { label: "Community", description: "Moderation defaults." },
  seo: { label: "SEO", description: "Site-wide defaults." },
  ai: { label: "Globify AI", description: "Switch AI features on or off without a deploy." },
  features: { label: "Feature flags", description: "Turn public features on or off." },
};

export default async function SettingsPage() {
  await requirePermission("settings.manage");
  const [settings, campuses] = await Promise.all([
    getSettings(),
    prisma.campus.findMany({ orderBy: { name: "asc" }, include: { classrooms: { orderBy: { name: "asc" } }, _count: { select: { students: true, batches: true } } } }),
  ]);
  const e = env();
  const integrations = [
    { name: "Database", ok: true, detail: "PostgreSQL via Prisma" },
    { name: "Email", ok: e.EMAIL_DRIVER !== "console", detail: e.EMAIL_DRIVER },
    { name: "WhatsApp", ok: e.WHATSAPP_DRIVER !== "console", detail: e.WHATSAPP_DRIVER },
    { name: "SMS", ok: e.SMS_DRIVER !== "console", detail: e.SMS_DRIVER },
    { name: "Storage", ok: true, detail: e.STORAGE_DRIVER },
    { name: "Payments", ok: e.PAYMENT_PROVIDERS.split(",").some((p) => p.trim() && p.trim() !== "bank_transfer"), detail: e.PAYMENT_PROVIDERS },
    { name: "Live classes", ok: e.LIVE_CLASS_DRIVER !== "manual", detail: e.LIVE_CLASS_DRIVER },
    { name: "Globify AI", ok: isAiConfigured(), detail: e.AI_PROVIDER },
    { name: "Background jobs", ok: !!e.REDIS_URL, detail: e.REDIS_URL ? "Redis + BullMQ" : "inline (no Redis)" },
  ];
  const grouped = Object.entries(GROUPS).map(([group, meta]) => ({ group, ...meta, keys: (Object.keys(SETTING_DEFAULTS) as Array<keyof typeof SETTING_DEFAULTS>).filter((k) => k.startsWith(`${group}.`)).map((k) => ({ key: k, value: settings[k], kind: typeof SETTING_DEFAULTS[k] as "string" | "number" | "boolean" })) })).filter((g) => g.keys.length);
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Settings" description="Platform configuration. Secrets and provider keys live in the server environment and are never shown here." />
      <section className="surface p-5">
        <p className="text-h4 mb-3">Integrations</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {integrations.map((i) => <div key={i.name} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"><span>{i.name}<span className="block text-caption text-fg-subtle">{i.detail}</span></span><Badge variant={i.ok ? "success" : "default"}>{i.ok ? "Configured" : "Not configured"}</Badge></div>)}
        </div>
      </section>
      <SettingsForm groups={grouped} />
      <CampusManager campuses={campuses.map((c) => ({ id: c.id, code: c.code, name: c.name, city: c.city, country: c.country, address: c.address ?? "", phone: c.phone ?? "", email: c.email ?? "", timezone: c.timezone, isActive: c.isActive, students: c._count.students, batches: c._count.batches, classrooms: c.classrooms.map((r) => ({ id: r.id, name: r.name, capacity: r.capacity, floor: r.floor ?? "", equipment: r.equipment })) }))} />
    </div>
  );
}
