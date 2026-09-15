import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "@/server/db/prisma";

/**
 * Platform settings with typed defaults. Values live in the `settings` table
 * and are editable from /admin/settings without a deploy.
 */
export const SETTING_DEFAULTS = {
  "institute.name": "Globify Tech",
  "institute.currency": "PKR",
  "institute.timezone": "Asia/Karachi",
  "institute.supportEmail": "info@globifytech.com",
  "institute.whatsapp": "+92 339 1110172",
  "attendance.warningPercent": 75,
  "attendance.criticalPercent": 60,
  "completion.defaultMinQuizPercent": 60,
  "completion.autoIssueCertificate": true,
  "certificates.signatoryName": "Director, Globify Tech",
  "certificates.prefix": "GT",
  "finance.invoiceDueDays": 7,
  "finance.reminderDaysBefore": 3,
  "risk.inactiveDaysHigh": 10,
  "risk.inactiveDaysMedium": 5,
  "gamification.enabled": true,
  "community.requireApproval": false,
  "seo.defaultOgImage": "",
  "ai.tutorEnabled": true,
  "ai.courseBuilderEnabled": true,
  "ai.adminAssistantEnabled": true,
  "features.applyOnline": true,
  "features.jobsBoard": true,
  "features.portfolio": true,
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;
export type SettingValue<K extends SettingKey> = (typeof SETTING_DEFAULTS)[K];

const loadAll = unstable_cache(
  async () => {
    const rows = await prisma.setting.findMany();
    return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, unknown>;
  },
  ["settings"],
  { tags: ["settings"], revalidate: 300 },
);

export async function getSetting<K extends SettingKey>(key: K): Promise<SettingValue<K>> {
  const all = await loadAll();
  return (all[key] as SettingValue<K> | undefined) ?? SETTING_DEFAULTS[key];
}

export async function getSettings(): Promise<Record<SettingKey, unknown>> {
  const all = await loadAll();
  const out = { ...SETTING_DEFAULTS } as Record<SettingKey, unknown>;
  for (const key of Object.keys(SETTING_DEFAULTS) as SettingKey[]) if (key in all) out[key] = all[key];
  return out;
}

export async function setSetting(key: string, value: unknown, updatedById: string, group = key.split(".")[0] ?? "general") {
  await prisma.setting.upsert({
    where: { key },
    update: { value: value as never, updatedById },
    create: { key, value: value as never, group, updatedById },
  });
  revalidateTag("settings", "max");
}
