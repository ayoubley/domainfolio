import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import { RiskBadge, StatusBadge } from "@/components/shared/StatusBadge";
import { money, relativeDays } from "@/lib/format";
import type { DerivedDomain } from "@/lib/domain-rules";
import { cn } from "@/lib/utils";

/** Compact domain summary used on narrow screens instead of table rows. */
export function DomainCard({ domain, onOpen }: { domain: DerivedDomain; onOpen: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-lg border border-border bg-card p-3.5 text-start shadow-xs transition-colors hover:border-border-strong"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-2sm font-medium tabular text-foreground">{domain.domain}</span>
          <span className="mt-0.5 block truncate text-2xs text-muted-foreground">
            {domain.registrar ?? t("common.none2")}
            {domain.expiry_date ? ` · ${t("domains.detail.expiresOn", { date: domain.expiry_date })}` : ""}
          </span>
        </span>
        <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground rtl:rotate-180" />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <StatusBadge status={domain.effectiveStatus} />
        {domain.effectiveStatus !== "sold" ? <RiskBadge risk={domain.expiryRisk} /> : null}
        {domain.daysLeft !== null && domain.effectiveStatus !== "sold" ? (
          <span
            className={cn(
              "tabular text-2xs font-medium",
              domain.daysLeft < 0 ? "text-negative" : domain.daysLeft <= 30 ? "text-status-expiring" : "text-muted-foreground"
            )}
          >
            {relativeDays(domain.daysLeft)}
          </span>
        ) : null}
      </div>

      <div className="mt-2.5 flex items-center justify-between border-t border-border pt-2.5 text-2xs">
        <span className="text-muted-foreground">{t("domains.columns.askingPrice")}</span>
        <span className="tabular font-medium text-foreground">
          {money(domain.asking_price, { currency: domain.purchase_currency })}
        </span>
      </div>
    </button>
  );
}
