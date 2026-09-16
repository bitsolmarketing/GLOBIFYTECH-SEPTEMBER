import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "@/server/db/prisma";
import { SETTING_DEFAULTS, type SettingKey, type SettingValue } from "@/config/settings";

export { SETTING_DEFAULTS, type SettingKey, type SettingValue } from "@/config/settings";

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
