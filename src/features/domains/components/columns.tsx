import type { ColumnDef } from "@tanstack/react-table";
import type { ReactNode } from "react";
import type { TFunction } from "i18next";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Checkbox } from "@/components/ui/checkbox";
import { AutoRenewSwitch, LifecycleBadge, SourceBadge } from "@/features/domains/components/DomainCells";
import type { DerivedDomain } from "@/lib/domain-rules";
import { formatDate, money } from "@/lib/format";
import type { DomainUpdate } from "@/types/database";
import { cn } from "@/lib/utils";

export type ColumnContext = {
  t: TFunction;
  /** Optimistic single-field write used by the inline auto-renew toggle. */
  onQuickUpdate: (domain: DerivedDomain, values: DomainUpdate) => void;
  onOpenDetail: (domain: DerivedDomain) => void;
  /** The ⋯ row menu, supplied by the page so the menu owns its dialogs. */
  renderActions: (domain: DerivedDomain) => ReactNode;
};

/**
 * The domains table: six columns and nothing else — domain (with its ⋯ menu and
 * status badges), purchase price, purchase date, expiry date, registrar and the
 * auto-renew toggle.
 *
 * Declared as object literals (not `createColumnHelper`) so the whole array is
 * precisely `ColumnDef<DerivedDomain, unknown>[]` without leaning on `any`.
 */
export function createDomainColumns({
  t,
  onQuickUpdate,
  onOpenDetail,
  renderActions,
}: ColumnContext): ColumnDef<DerivedDomain, unknown>[] {
  return [
    {
      id: "select",
      size: 36,
      enableSorting: false,
      enableHiding: false,
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
      size: 340,
      enableHiding: false,
      cell: ({ row }) => (
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="shrink-0" onClick={event => event.stopPropagation()}>
            {renderActions(row.original)}
          </span>
          <button
            type="button"
            onClick={event => {
              event.stopPropagation();
              onOpenDetail(row.original);
            }}
            className="font-medium tabular text-foreground transition-colors hover:text-primary"
          >
            {row.original.domain}
          </button>
          <StatusBadge status={row.original.effectiveStatus} />
          {row.original.lifecycle ? <LifecycleBadge tone={row.original.lifecycle} /> : null}
          <SourceBadge source={row.original.source} />
          {row.original.archived_at ? (
            <span className="rounded bg-muted px-1 text-2xs text-muted-foreground">{t("nav.archive")}</span>
          ) : null}
        </span>
      ),
    },
    {
      id: "purchasePrice",
      accessorFn: row => row.purchase_price ?? 0,
      header: t("domains.columns.purchasePrice"),
      size: 120,
      cell: ({ row }) => (
        <span className="tabular font-medium text-foreground">
          {money(row.original.purchase_price, { currency: row.original.purchase_currency })}
        </span>
      ),
    },
    {
      id: "purchaseDate",
      accessorFn: row => row.purchase_date ?? "",
      header: t("domains.columns.purchaseDate"),
      size: 120,
      cell: ({ row }) => (
        <span className="tabular text-muted-foreground">
          {row.original.purchase_date ? formatDate(row.original.purchase_date) : "—"}
        </span>
      ),
    },
    {
      id: "expiryDate",
      // Sorted by "next to expire": days left, with undated domains last.
      accessorFn: row => row.daysLeft ?? Number.POSITIVE_INFINITY,
      header: t("domains.columns.expiryDate"),
      size: 130,
      cell: ({ row }) => {
        const { expiry_date, daysLeft } = row.original;
        if (!expiry_date) return <span className="text-muted-foreground">—</span>;
        const urgent = daysLeft !== null && daysLeft <= 30;
        return (
          <span className={cn("tabular", urgent ? "font-medium text-negative" : "text-muted-foreground")}>
            {formatDate(expiry_date)}
          </span>
        );
      },
    },
    {
      id: "registrar",
      accessorFn: row => row.registrar ?? "—",
      header: t("domains.columns.registrar"),
      size: 150,
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.registrar ?? "—"}</span>,
    },
    {
      id: "autoRenew",
      accessorFn: row => (row.auto_renew ? 1 : 0),
      header: t("domains.columns.autoRenew"),
      size: 110,
      cell: ({ row }) => (
        <AutoRenewSwitch
          checked={row.original.auto_renew}
          onCheckedChange={value => onQuickUpdate(row.original, { auto_renew: value })}
        />
      ),
    },
  ];
}

/** Columns shown before the user opens the column picker. */
export const DEFAULT_VISIBLE_COLUMNS = [
  "select",
  "domain",
  "purchasePrice",
  "purchaseDate",
  "expiryDate",
  "registrar",
  "autoRenew",
];
