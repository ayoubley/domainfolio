import { useTranslation } from "react-i18next";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { StatusBadge, STATUS_VARIANT } from "@/components/shared/StatusBadge";
import type { LifecycleTone } from "@/lib/domain-rules";
import type { DomainSource, DomainStatus } from "@/types/database";
import { cn } from "@/lib/utils";

/** The four states the status column offers, in the order the owner listed them. */
export const STATUS_OPTIONS = ["listed", "hold", "active", "expired"] as const satisfies readonly DomainStatus[];

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

/**
 * The status cell: the owner's four states, changeable in place. It wears the
 * same colours as the status badge, and never shows a state the stored record
 * contradicts.
 */
export function StatusSelect({
  status,
  onChange,
  disabled,
}: {
  status: DomainStatus;
  onChange: (status: DomainStatus) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();

  // "Sold" is derived from the sale fields, not something this picker can set,
  // so it reads as a badge instead of an empty select (the archive lists sold
  // rows; the live table never shows them).
  if (!STATUS_OPTIONS.includes(status as (typeof STATUS_OPTIONS)[number])) {
    return <StatusBadge status={status} />;
  }

  return (
    // Changing the status must never bubble to the row click.
    <span className="inline-flex" onClick={event => event.stopPropagation()}>
      <Select value={status} onValueChange={value => onChange(value as DomainStatus)} disabled={disabled}>
        <SelectTrigger
          aria-label={t("status.label")}
          className={cn(
            "h-6 w-auto gap-1 shadow-none",
            badgeVariants({ variant: STATUS_VARIANT[status] })
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map(option => (
            <SelectItem key={option} value={option}>
              {t(`status.${option}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </span>
  );
}
