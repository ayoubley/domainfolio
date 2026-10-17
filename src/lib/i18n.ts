import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import { ar } from "@/locales/ar";
import { en } from "@/locales/en";

export const SUPPORTED_LANGUAGES = ["en", "ar"] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_STORAGE_KEY = "domainfolio.lang";

/** Normalises anything i18next detects into one of our two languages. */
export function resolveLanguage(value: string | null | undefined): AppLanguage {
  return value?.toLowerCase().startsWith("ar") ? "ar" : "en";
}

export function isRtl(language: string): boolean {
  return resolveLanguage(language) === "ar";
}

/**
 * Applies `dir` and `lang` to <html>. Called on boot and on every change so the
 * document is always in sync with the active locale — including the mirrored
 * layout that logical CSS properties depend on.
 */
export function applyDocumentLanguage(language: string) {
  if (typeof document === "undefined") return;
  const resolved = resolveLanguage(language);
  document.documentElement.lang = resolved;
  document.documentElement.dir = isRtl(resolved) ? "rtl" : "ltr";
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ["localStorage"],
    },
    returnNull: false,
  });

applyDocumentLanguage(i18n.language);
i18n.on("languageChanged", applyDocumentLanguage);

export default i18n;
