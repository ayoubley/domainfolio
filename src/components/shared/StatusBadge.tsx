import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import type { ExpiryRisk, RecommendedAction } from "@/lib/domain-rules";
import type { DomainStatus } from "@/types/database";

const STATUS_VARIANT: Record<DomainStatus, BadgeProps["variant"]> = {
  active: "active",
  listed: "listed",
  sold: "sold",
  expired: "expired",
};

const RISK_VARIANT: Record<ExpiryRisk, BadgeProps["variant"]> = {
  expired: "expired",
  "0-30": "expiring",
  "31-60": "warning",
  "61-90": "warning",
  "91-180": "neutral",
  "180+": "neutral",
  missing: "outline",
};

const ACTION_VARIANT: Record<RecommendedAction, BadgeProps["variant"]> = {
  renew: "active",
  review: "warning",
  dont_renew: "expired",
  list_for_sale: "listed",
  hold: "neutral",
  already_sold: "sold",
};

/** The one place that decides how a domain status is coloured and labelled. */
export function StatusBadge({ status, className }: { status: DomainStatus; className?: string }) {
  const { t } = useTranslation();
  return (
    <Badge variant={STATUS_VARIANT[status]} className={className}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {t(`status.${status}`)}
    </Badge>
  );
}

export function RiskBadge({ risk, className }: { risk: ExpiryRisk; className?: string }) {
  const { t } = useTranslation();
  return (
    <Badge variant={RISK_VARIANT[risk]} className={className}>
      {t(`risk.${risk}`)}
    </Badge>
  );
}

export function RecommendedActionBadge({ action, className }: { action: RecommendedAction; className?: string }) {
  const { t } = useTranslation();
  return (
    <Badge variant={ACTION_VARIANT[action]} className={className}>
      {t(`recommended.${action}`)}
    </Badge>
  );
}
