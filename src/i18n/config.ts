export const LOCALES = ["en", "ur", "ar", "pa"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "globify.locale";
export const RTL_LOCALES: readonly Locale[] = ["ur", "ar"];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  ur: "اردو",
  ar: "العربية",
  pa: "پنجابی",
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function directionFor(locale: string): "ltr" | "rtl" {
  return (RTL_LOCALES as readonly string[]).includes(locale) ? "rtl" : "ltr";
}
