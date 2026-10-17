import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { isRtl, resolveLanguage, type AppLanguage } from "@/lib/i18n";

/** Language plus RTL helpers, driven entirely by i18next. */
export function useLanguage() {
  const { i18n } = useTranslation();
  const language = resolveLanguage(i18n.language);

  const setLanguage = useCallback(
    async (next: AppLanguage) => {
      if (resolveLanguage(i18n.language) === next) return;
      await i18n.changeLanguage(next);
    },
    [i18n]
  );

  const toggleLanguage = useCallback(async () => {
    await setLanguage(language === "ar" ? "en" : "ar");
  }, [language, setLanguage]);

  return { language, setLanguage, toggleLanguage, isRtl: isRtl(language) };
}
