"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isLocale, LOCALE_COOKIE } from "@/i18n/config";
import { getSession } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";

export async function setLocale(locale: string): Promise<void> {
  if (!isLocale(locale)) return;
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  const user = await getSession();
  if (user) await prisma.user.update({ where: { id: user.id }, data: { locale } }).catch(() => undefined);
  revalidatePath("/", "layout");
}
