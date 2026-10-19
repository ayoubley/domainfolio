import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { CalendarClock, Contact, ListTree, Pencil, TrendingUp, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { RecommendedActionBadge, RiskBadge, StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DomainEditCard } from "@/features/domains/components/DomainEditCard";
import { useArchiveDomain, useDomainActivityQuery, useDomainsQuery, useQuickUpdateDomain } from "@/features/domains/queries";
import { getTld, ownedPortfolio } from "@/lib/domain-rules";
import { formatDate, money, percent, relativeDays, signedMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { DomainUpdate } from "@/types/database";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="text-2xs text-muted-foreground">{label}</dt>
      <dd className="text-2sm font-medium tabular text-foreground">{children}</dd>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-xs">
      <h2 className="mb-2 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" />
        {title}
      </h2>
      <dl className="divide-y divide-border">{children}</dl>
    </section>
  );
}

/**
 * One domain's record. `/domains/<n>` where `n` is the domain's position in the
 * portfolio order — the same number the Domains table shows in its first
 * column — so the address is always resolvable back to the same row.
 */
export function DomainRecordPage() {
  const { index } = useParams();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const locale = i18n.language.startsWith("ar") ? "ar" : "en";
  const [editing, setEditing] = useState(false);

  const { data: rows, isLoading, isError, refetch, isFetching } = useDomainsQuery();
  const quickUpdate = useQuickUpdateDomain();
  const archiveMutation = useArchiveDomain();
  const portfolio = useMemo(() => ownedPortfolio(rows ?? []), [rows]);

  const position = Number(index);
  const domain = Number.isInteger(position) && position >= 1 ? (portfolio[position - 1] ?? null) : null;
  const { data: activity } = useDomainActivityQuery(domain?.id ?? null);

  const backButton = (
    <Button variant="outline" onClick={() => navigate("/domains")}>
      <ListTree />
      {t("domains.record.back")}
    </Button>
  );

  if (isError) {
    return (
      <div className="space-y-5">
        <PageHeader title={t("domains.record.title")} description={t("domains.record.subtitle")} />
        <ErrorState onRetry={() => void refetch()} retrying={isFetching} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, card) => (
            <Skeleton key={card} className="h-56 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!domain) {
    return (
      <div className="space-y-5">
        <PageHeader title={t("domains.record.title")} description={t("domains.record.subtitle")} />
        <div className="rounded-lg border border-dashed border-border-strong bg-card">
          <EmptyState
            icon={Contact}
            title={t("domains.record.notFound")}
            description={t("domains.record.notFoundHint")}
            action={backButton}
          />
        </div>
      </div>
    );
  }

  const currency = domain.purchase_currency;

  return (
    <div className="space-y-5">
      <PageHeader
        title={
          <span dir="ltr" className="tabular">
            {domain.domain}
          </span>
        }
        description={t("domains.record.subtitle")}
        actions={
          <>
            <Button variant="primary" onClick={() => setEditing(true)}>
              <Pencil />
              {t("domains.detail.edit")}
            </Button>
            {backButton}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Section icon={Contact} title={t("domains.record.assets")}>
          <Row label={t("domains.columns.domain")}>
            <span dir="ltr">{domain.domain}</span>
          </Row>
          <Row label={t("domains.form.tld")}>{domain.tld ?? getTld(domain.domain) ?? "—"}</Row>
          <Row label={t("domains.columns.registrar")}>{domain.registrar ?? "—"}</Row>
          <Row label={t("domains.columns.purchaseDate")}>
            {domain.purchase_date ? formatDate(domain.purchase_date) : "—"}
          </Row>
          <Row label={t("domains.columns.expiryDate")}>
            {domain.expiry_date ? formatDate(domain.expiry_date) : "—"}
          </Row>
          <Row label={t("domains.form.status")}>
            <StatusBadge status={domain.effectiveStatus} />
          </Row>
          <Row label={t("domains.columns.listedOn")}>
            {domain.listed_on && domain.listed_on.length > 0 ? domain.listed_on.join(", ") : "—"}
          </Row>
          <Row label={t("domains.columns.askingPrice")}>{money(domain.asking_price, { currency })}</Row>
          <Row label={t("domains.form.niche")}>{domain.niche ?? "—"}</Row>
        </Section>

        <Section icon={CalendarClock} title={t("domains.record.renewal")}>
          <Row label={t("domains.detail.daysLeft")}>
            <span
              className={cn(
                domain.daysLeft !== null && domain.daysLeft < 0 && "text-negative",
                domain.daysLeft !== null && domain.daysLeft >= 0 && domain.daysLeft <= 30 && "text-status-expiring"
              )}
            >
              {relativeDays(domain.daysLeft, locale)}
            </span>
          </Row>
          <Row label={t("domains.record.risk")}>
            <RiskBadge risk={domain.expiryRisk} />
          </Row>
          <Row label={t("domains.form.renewalCost")}>{money(domain.renewal_cost, { currency })}</Row>
          <Row label={t("domains.columns.renewalDecision")}>{t(`decision.${domain.renewal_decision}`)}</Row>
          <Row label={t("domains.record.recommended")}>
            <RecommendedActionBadge action={domain.recommendedAction} />
          </Row>
        </Section>

        <Section icon={Wallet} title={t("domains.record.finance")}>
          <Row label={t("domains.columns.purchasePrice")}>{money(domain.purchase_price, { currency })}</Row>
          <Row label={t("domains.columns.salePrice")}>{money(domain.sale_price, { currency })}</Row>
          <Row label={t("domains.columns.netProceeds")}>{money(domain.proceeds, { currency })}</Row>
          <Row label={t("domains.detail.profit")}>
            <span
              className={cn(
                domain.netProfit === null
                  ? "text-foreground"
                  : domain.netProfit >= 0
                    ? "text-positive"
                    : "text-negative"
              )}
            >
              {domain.netProfit === null ? "—" : signedMoney(domain.netProfit, currency)}
            </span>
          </Row>
          <Row label={t("domains.columns.roi")}>{percent(domain.roi)}</Row>
          <Row label={t("domains.record.holding")}>
            {domain.holdingDays === null ? "—" : t("common.daysValue", { count: domain.holdingDays })}
          </Row>
        </Section>
      </div>

      <section className="rounded-lg border border-border bg-card p-4 shadow-xs">
        <h2 className="mb-3 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
          <TrendingUp className="size-3.5" />
          {t("domains.record.activity")}
        </h2>
        {!activity || activity.length === 0 ? (
          <p className="text-2xs text-muted-foreground">{t("dashboard.activity.empty")}</p>
        ) : (
          <ol className="space-y-3">
            {activity.map(entry => (
              <li key={entry.id} className="relative ps-4">
                <span className="absolute start-0 top-1.5 size-1.5 rounded-full bg-primary" aria-hidden />
                <p className="text-2xs text-foreground">{entry.summary}</p>
                <p className="text-2xs text-muted-foreground">
                  {t(`activityAction.${entry.action}`)} · {formatDate(entry.created_at)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <DomainEditCard
        open={editing}
        onOpenChange={setEditing}
        domain={domain}
        onSubmit={async input => {
          const values: DomainUpdate = {
            purchase_price: input.purchasePrice,
            purchase_date: input.purchaseDate,
            registrar: input.registrar || null,
            purchase_currency: input.currency,
            auto_renew: input.autoRenew,
          };
          if (input.markSold) {
            values.status = "sold";
            values.sold_date = input.soldDate;
            values.sale_price = input.salePrice;
            values.notes = input.saleNotes || null;
          }

          await quickUpdate.mutateAsync({ previous: domain, values });

          if (input.markSold) {
            // The sale lives on its own page, so the record stops resolving here.
            await archiveMutation.mutateAsync({ domainId: domain.id, reason: "sold" });
            toast.success(t("domains.sold.done", { domain: domain.domain }));
            navigate("/sales");
            return;
          }
          toast.success(t("domains.detail.updated", { domain: domain.domain }));
        }}
      />
    </div>
  );
}
