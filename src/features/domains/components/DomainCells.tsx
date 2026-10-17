import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import type { LifecycleTone } from "@/lib/domain-rules";
import type { DomainSource } from "@/types/database";
import { cn } from "@/lib/utils";

/** Registry lifecycle badge (Redemption / Expired / Grace / Hold). */
const LIFECYCLE_CLASS: Record<LifecycleTone, string> = {
  redemption: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  expired: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
  grace: "bg-pink-500/15 text-pink-700 dark:text-pink-300",
  hold: "bg-red-500/15 text-red-700 dark:text-red-300",
};

export function LifecycleBadge({ tone }: { tone: LifecycleTone }) {
  const { t } = useTranslation();
  return (
    <Badge className={cn("border-transparent", LIFECYCLE_CLASS[tone])}>{t(`lifecycle.${tone}`)}</Badge>
  );
}

/** "Imported" source badge — no connected account reports this name. */
export function SourceBadge({ source }: { source: DomainSource }) {
  const { t } = useTranslation();
  if (source !== "imported") return null;
  return (
    <Badge variant="outline" className="text-muted-foreground">
      {t("domains.source.imported")}
    </Badge>
  );
}

/** Auto-renew toggle. Writes optimistically through the quick-update mutation. */
export function AutoRenewSwitch({
  checked,
  onCheckedChange,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    // Toggling must never bubble to the row click, otherwise the domain detail
    // panel slides in every time the switch is flipped.
    <span className="inline-flex" onClick={event => event.stopPropagation()}>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={t("domains.form.autoRenew")}
      />
    </span>
  );
}
