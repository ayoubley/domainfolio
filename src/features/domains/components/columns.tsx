import type { ColumnDef } from "@tanstack/react-table";
import type { ReactNode } from "react";
import type { TFunction } from "i18next";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AutoRenewSwitch,
  LifecycleBadge,
  SourceBadge,
  StatusSelect,
} from "@/features/domains/components/DomainCells";
import type { DerivedDomain } from "@/lib/domain-rules";
import { formatDate, money } from "@/lib/format";
import type { DomainUpdate } from "@/types/database";
import { cn } from "@/lib/utils";

export type ColumnContext = {
  t: TFunction;
  /** Optimistic single-field write used by the inline auto-renew toggle. */
  onQuickUpdate: (domain: DerivedDomain, values: DomainUpdate) => void;
  /** Domain-name click → the domain's record page (`/domains/<n>`). */
  onOpenRecord: (domain: DerivedDomain) => void;
  /** 1-based portfolio position per domain id, for the leading number column. */
  positions: Map<string, number>;
  /** The ⋯ row menu, supplied by the page so the menu owns its dialogs. */
  renderActions: (domain: DerivedDomain) => ReactNode;
};

/**
 * The domains table: the row number, the select checkboxes, then domain (name,
 * its ⋯ menu and status badges), status, purchase price, purchase date, expiry
 * date, registrar and the auto-renew toggle.
 *
 * Declared as object literals (not `createColumnHelper`) so the whole array is
 * precisely `ColumnDef<DerivedDomain, unknown>[]` without leaning on `any`.
 */
export function createDomainColumns({
  t,
  onQuickUpdate,
  onOpenRecord,
  positions,
  renderActions,
}: ColumnContext): ColumnDef<DerivedDomain, unknown>[] {
  return [
    {
      id: "index",
      size: 48,
      enableSorting: false,
      enableHiding: false,
      header: t("domains.columns.index"),
      cell: ({ row }) => (
        <span className="tabular text-2xs text-muted-foreground">{positions.get(row.original.id) ?? "—"}</span>
      ),
    },
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
      cell: ({ row }) => {
        const position = positions.get(row.original.id);
        return (
          <span className="flex flex-wrap items-center gap-1.5">
            {position ? (
              <button
                type="button"
                onClick={event => {
                  event.stopPropagation();
                  onOpenRecord(row.original);
                }}
                className="font-medium tabular text-foreground transition-colors hover:text-primary"
              >
                {row.original.domain}
              </button>
            ) : (
              <span className="font-medium tabular text-foreground">{row.original.domain}</span>
            )}
            <span className="shrink-0" onClick={event => event.stopPropagation()}>
              {renderActions(row.original)}
            </span>
            <StatusBadge status={row.original.effectiveStatus} />
            {row.original.lifecycle ? <LifecycleBadge tone={row.original.lifecycle} /> : null}
            <SourceBadge source={row.original.source} />
            {row.original.archived_at ? (
              <span className="rounded bg-muted px-1 text-2xs text-muted-foreground">{t("nav.archive")}</span>
            ) : null}
          </span>
        );
      },
    },
    {
      id: "status",
      accessorFn: row => row.effectiveStatus,
      header: t("status.label"),
      size: 130,
      cell: ({ row }) => (
        <StatusSelect
          status={row.original.effectiveStatus}
          onChange={value =>
            onQuickUpdate(
              row.original,
              // "Not listed" also clears the marketplaces the domain was on:
              // that is what the choice means, and the column must never show a
              // state the stored record contradicts.
              value === "active" ? { status: value, listed_on: null } : { status: value },
            )
          }
        />
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
  "index",
  "select",
  "domain",
  "status",
  "purchasePrice",
  "purchaseDate",
  "expiryDate",
  "registrar",
  "autoRenew",
];
