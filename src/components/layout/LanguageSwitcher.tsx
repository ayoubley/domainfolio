import { Check, Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { useLanguage } from "@/hooks/useLanguage";
import { SUPPORTED_LANGUAGES } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  return (
    <DropdownMenu>
      {compact ? (
        <SimpleTooltip content={t("language.toggle")}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={t("language.toggle")}>
              <Languages />
            </Button>
          </DropdownMenuTrigger>
        </SimpleTooltip>
      ) : (
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" aria-label={t("language.toggle")}>
            <Languages />
            {language === "ar" ? "العربية" : "English"}
          </Button>
        </DropdownMenuTrigger>
      )}
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>{t("language.label")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SUPPORTED_LANGUAGES.map(code => (
          <DropdownMenuItem
            key={code}
            onClick={() => void setLanguage(code)}
            className={cn(language === code && "bg-muted text-foreground")}
          >
            {language === code ? <Check /> : <span className="size-4" />}
            {t(`language.${code}`)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
