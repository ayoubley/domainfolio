import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpRight } from "lucide-react";
import type { TFunction } from "i18next";
import { RiskBadge, StatusBadge } from "@/components/shared/StatusBadge";
import { Checkbox } from "@/components/ui/checkbox";
import type { DerivedDomain } from "@/lib/domain-rules";
import { formatDate, money, percent, relativeDays, signedMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ColumnContext = { t: TFunction };

/**
 * Every domain column in one place, so the header, the mobile cards and the
 * export all agree on what "the domain row" means.
 *
 * Declared as object literals (not `createColumnHelper`) so the whole array is
 * precisely `ColumnDef<DerivedDomain, unknown>[]` without leaning on `any`.
 */
export function createDomainColumns({ t }: ColumnContext): ColumnDef<DerivedDomain, unknown>[] {
  return [
    {
      id: "select",
      size: 36,
      enableSorting: false,
      header: ({ table }) => (
        <Checkbox
          aria-label={t("common.selectAll")}
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={value => table.toggleAllPageRowsSelected(Boolean(value))}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          aria-label={row.original.domain}
          checked={row.getIsSelected()}
          onCheckedChange={value => row.toggleSelected(Boolean(value))}
          onClick={event => event.stopPropagation()}
        />
      ),
    },
    {
      id: "domain",
      accessorKey: "domain",
      header: t("domains.columns.domain"),
      size: 220,
      cell: ({ row }) => (
        <span className="flex items-center gap-1.5">
          <span className="font-medium tabular text-foreground">{row.original.domain}</span>
          {row.original.archived_at ? (
            <span className="rounded bg-muted px-1 text-2xs text-muted-foreground">{t("nav.archive")}</span>
          ) : null}
        </span>
      ),
    },
    {
      id: "status",
      accessorFn: row => row.effectiveStatus,
      header: t("domains.columns.status"),
      size: 110,
      cell: ({ row }) => <StatusBadge status={row.original.effectiveStatus} />,
    },
    {
      id: "registrar",
      accessorFn: row => row.registrar ?? "—",
      header: t("domains.columns.registrar"),
      size: 140,
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.registrar ?? "—"}</span>,
    },
    {
      id: "expiryDate",
      accessorFn: row => row.expiry_date ?? "",
      header: t("domains.columns.expiryDate"),
      size: 130,
      cell: ({ row }) => (
        <span className="tabular text-muted-foreground">
          {row.original.expiry_date ? formatDate(row.original.expiry_date) : "—"}
        </span>
      ),
    },
    {
      id: "daysLeft",
      accessorFn: row => row.daysLeft ?? Number.POSITIVE_INFINITY,
      header: t("domains.columns.daysLeft"),
      size: 110,
      cell: ({ row }) => {
        const { daysLeft, effectiveStatus } = row.original;
        if (daysLeft === null || effectiveStatus === "sold") return <span className="text-muted-foreground">—</span>;
        return (
          <span
            className={cn(
              "tabular font-medium",
              daysLeft < 0 ? "text-negative" : daysLeft <= 30 ? "text-status-expiring" : "text-foreground"
            )}
          >
            {relativeDays(daysLeft)}
          </span>
        );
      },
    },
    {
      id: "risk",
      accessorFn: row => row.expiryRisk,
      header: t("domains.filters.risk"),
      size: 120,
      cell: ({ row }) => <RiskBadge risk={row.original.expiryRisk} />,
    },
    {
      id: "purchasePrice",
      accessorFn: row => row.purchase_price ?? 0,
      header: t("domains.columns.purchasePrice"),
      size: 110,
      cell: ({ row }) => (
        <span className="tabular text-muted-foreground">
          {money(row.original.purchase_price, { currency: row.original.purchase_currency })}
        </span>
      ),
    },
    {
      id: "renewalCost",
      accessorFn: row => row.renewal_cost ?? 0,
      header: t("domains.columns.renewalCost"),
      size: 110,
      cell: ({ row }) => (
        <span className="tabular text-muted-foreground">
          {money(row.original.renewal_cost, { currency: row.original.purchase_currency })}
        </span>
      ),
    },
    {
      id: "renewalDecision",
      accessorFn: row => row.renewal_decision,
      header: t("domains.columns.renewalDecision"),
      size: 130,
      cell: ({ row }) => <span className="text-muted-foreground">{t(`decision.${row.original.renewal_decision}`)}</span>,
    },
    {
      id: "askingPrice",
      accessorFn: row => row.asking_price ?? 0,
      header: t("domains.columns.askingPrice"),
      size: 120,
      cell: ({ row }) => (
        <span className="tabular text-foreground">
          {money(row.original.asking_price, { currency: row.original.purchase_currency })}
        </span>
      ),
    },
    {
      id: "salePrice",
      accessorFn: row => row.sale_price ?? 0,
      header: t("domains.columns.salePrice"),
      size: 120,
      cell: ({ row }) => (
        <span className="tabular text-muted-foreground">
          {money(row.original.sale_price, { currency: row.original.purchase_currency })}
        </span>
      ),
    },
    {
      id: "netProfit",
      accessorFn: row => row.netProfit ?? 0,
      header: t("domains.columns.netProfit"),
      size: 120,
      cell: ({ row }) => {
        const { netProfit, purchase_currency } = row.original;
        if (netProfit === null) return <span className="text-muted-foreground">—</span>;
        return (
          <span className={cn("tabular font-medium", netProfit >= 0 ? "text-positive" : "text-negative")}>
            {signedMoney(netProfit, purchase_currency)}
          </span>
        );
      },
    },
    {
      id: "roi",
      accessorFn: row => row.roi ?? 0,
      header: t("domains.columns.roi"),
      size: 90,
      cell: ({ row }) => {
        const { roi } = row.original;
        if (roi === null) return <span className="text-muted-foreground">—</span>;
        return (
          <span className={cn("tabular font-medium", roi >= 0 ? "text-positive" : "text-negative")}>
            {roi > 0 ? <ArrowUpRight className="me-0.5 inline size-3" /> : null}
            {percent(roi)}
          </span>
        );
      },
    },
    {
      id: "niche",
      accessorFn: row => row.niche ?? "—",
      header: t("domains.columns.niche"),
      size: 130,
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.niche ?? "—"}</span>,
    },
    {
      id: "tags",
      accessorFn: row => (row.tags ?? []).join(", "),
      header: t("domains.columns.tags"),
      size: 160,
      cell: ({ row }) => (
        <span className="block max-w-[160px] truncate text-muted-foreground">
          {(row.original.tags ?? []).join(", ") || "—"}
        </span>
      ),
    },
    {
      id: "listedOn",
      accessorFn: row => (row.listed_on ?? []).join(", "),
      header: t("domains.columns.listedOn"),
      size: 150,
      cell: ({ row }) => (
        <span className="block max-w-[150px] truncate text-muted-foreground">
          {(row.original.listed_on ?? []).join(", ") || "—"}
        </span>
      ),
    },
    {
      id: "updated",
      accessorFn: row => row.updated_at,
      header: t("domains.columns.updated"),
      size: 120,
      cell: ({ row }) => <span className="tabular text-muted-foreground">{formatDate(row.original.updated_at)}</span>,
    },
  ];
}

/** Columns shown before the user opens the column picker. */
export const DEFAULT_VISIBLE_COLUMNS = [
  "select",
  "domain",
  "status",
  "registrar",
  "expiryDate",
  "daysLeft",
  "renewalCost",
  "askingPrice",
];
