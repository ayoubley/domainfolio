import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { CalendarX2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LifecycleBadge } from "@/features/domains/components/DomainCells";
import { useDomainsQuery } from "@/features/domains/queries";
import { deriveDomains, isExpired } from "@/lib/domain-rules";
import type { DerivedDomain } from "@/lib/domain-rules";
import { formatDate, money, relativeDays } from "@/lib/format";

/**
 * Expired domains. The moment an expiry date falls behind today the domain
 * leaves the Domains list and shows up here — the row itself is untouched, so
 * renewing it brings it straight back.
 */
export function ExpiredPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("ar") ? "ar" : "en";
  const { data: rows, isLoading, isError, refetch, isFetching } = useDomainsQuery(true);

  const expired = useMemo(() => deriveDomains(rows ?? []).filter(isExpired), [rows]);

  const columns = useMemo<ColumnDef<DerivedDomain, unknown>[]>(
    () => [
      {
        id: "domain",
        accessorKey: "domain",
        header: t("domains.columns.domain"),
        size: 300,
        cell: ({ row }) => (
          <span className="flex flex-wrap items-center gap-1.5">
            <span dir="ltr" className="font-medium tabular text-foreground">
              {row.original.domain}
            </span>
            <StatusBadge status={row.original.effectiveStatus} />
            {row.original.lifecycle ? <LifecycleBadge tone={row.original.lifecycle} /> : null}
          </span>
        ),
      },
      {
        id: "expiryDate",
        accessorFn: row => row.daysLeft ?? Number.POSITIVE_INFINITY,
        header: t("domains.columns.expiryDate"),
        size: 130,
        cell: ({ row }) => (
          <span className="tabular font-medium text-negative">
            {row.original.expiry_date ? formatDate(row.original.expiry_date) : "—"}
          </span>
        ),
      },
      {
        id: "daysLeft",
        accessorFn: row => row.daysLeft ?? 0,
        header: t("domains.detail.overdue"),
        size: 130,
        cell: ({ row }) => (
          <span className="tabular text-muted-foreground">{relativeDays(row.original.daysLeft, locale)}</span>
        ),
      },
      {
        id: "registrar",
        accessorFn: row => row.registrar ?? "—",
        header: t("domains.columns.registrar"),
        size: 150,
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.registrar ?? "—"}</span>,
      },
      {
        id: "purchasePrice",
        accessorFn: row => row.purchase_price ?? 0,
        header: t("domains.columns.purchasePrice"),
        size: 130,
        cell: ({ row }) => (
          <span className="tabular text-muted-foreground">
            {money(row.original.purchase_price, { currency: row.original.purchase_currency })}
          </span>
        ),
      },
    ],
    [t, locale]
  );

  return (
    <div className="space-y-5">
      <PageHeader title={t("expired.title")} description={t("expired.subtitle")} />

      {isError ? (
        <ErrorState onRetry={() => void refetch()} retrying={isFetching} />
      ) : (
        <DataTable<DerivedDomain>
          columns={columns}
          data={expired}
          getRowId={row => row.id}
          isLoading={isLoading}
          initialSorting={[{ id: "daysLeft", desc: true }]}
          emptyState={
            <EmptyState icon={CalendarX2} title={t("expired.emptyTitle")} description={t("expired.emptyBody")} />
          }
        />
      )}
    </div>
  );
}
