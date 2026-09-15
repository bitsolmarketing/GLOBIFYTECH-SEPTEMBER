import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "./config";
import en from "./messages/en.json";

type Messages = Record<string, unknown>;

/** Deep-merge locale messages over English so untranslated keys fall back gracefully. */
function mergeMessages(base: Messages, override: Messages): Messages {
  const out: Messages = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const baseValue = out[key];
    if (value && typeof value === "object" && !Array.isArray(value) && baseValue && typeof baseValue === "object") {
      out[key] = mergeMessages(baseValue as Messages, value as Messages);
    } else {
      out[key] = value;
    }
  }
  return out;
}

async function resolveLocale(): Promise<Locale> {
  try {
    const store = await cookies();
    const fromCookie = store.get(LOCALE_COOKIE)?.value;
    if (fromCookie && isLocale(fromCookie)) return fromCookie;
    const accept = (await headers()).get("accept-language") ?? "";
    const first = accept.split(",")[0]?.trim().slice(0, 2).toLowerCase();
    if (first && isLocale(first)) return first;
  } catch {
    // Static rendering without request context
  }
  return DEFAULT_LOCALE;
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  let messages: Messages = en;
  if (locale !== DEFAULT_LOCALE) {
    const localeMessages = (await import(`./messages/${locale}.json`)).default as Messages;
    messages = mergeMessages(en, localeMessages);
  }
  return { locale, messages, timeZone: "Asia/Karachi" };
});
