import type { ColumnDef } from "@tanstack/react-table";
import type { ReactNode } from "react";
import type { TFunction } from "i18next";
import { RiskBadge, StatusBadge } from "@/components/shared/StatusBadge";
import { Checkbox } from "@/components/ui/checkbox";
import { AutoRenewSwitch, FolderCell, FlagToggle, LifecycleBadge, NameserversCell, SourceBadge } from "@/features/domains/components/DomainCells";
import type { DerivedDomain } from "@/lib/domain-rules";
import { formatDate, money, relativeDays } from "@/lib/format";
import type { DomainUpdate, FolderRow } from "@/types/database";
import { cn } from "@/lib/utils";

export type ColumnContext = {
  t: TFunction;
  folders: FolderRow[];
  /** Optimistic single-field write used by the inline toggles. */
  onQuickUpdate: (domain: DerivedDomain, values: DomainUpdate) => void;
  onAssignFolder: (domain: DerivedDomain, folderId: string | null) => void;
  onNewFolder: (domain: DerivedDomain) => void;
  onOpenDetail: (domain: DerivedDomain) => void;
  onOpenUrlForwarding: (domain: DerivedDomain) => void;
  onOpenNameservers: (domain: DerivedDomain) => void;
  /** The ⋯ row menu, supplied by the page so the menu owns its dialogs. */
  renderActions: (domain: DerivedDomain) => ReactNode;
};

/**
 * Every domain column in one place, so the header, the mobile cards and the
 * export all agree on what "the domain row" means.
 *
 * Declared as object literals (not `createColumnHelper`) so the whole array is
 * precisely `ColumnDef<DerivedDomain, unknown>[]` without leaning on `any`.
 */
export function createDomainColumns({
  t,
  folders,
  onQuickUpdate,
  onAssignFolder,
  onNewFolder,
  onOpenDetail,
  onOpenUrlForwarding,
  onOpenNameservers,
  renderActions,
}: ColumnContext): ColumnDef<DerivedDomain, unknown>[] {
  const folderOf = (folderId: string | null) => folders.find(folder => folder.id === folderId) ?? null;

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
      size: 260,
      enableHiding: false,
      cell: ({ row }) => (
        <span className="flex flex-wrap items-center gap-1.5">
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
      id: "folder",
      accessorFn: row => folderOf(row.folder_id)?.name ?? "",
      header: t("domains.columns.folder"),
      size: 140,
      cell: ({ row }) => (
        <FolderCell
          folder={folderOf(row.original.folder_id)}
          folders={folders}
          onAssign={folderId => onAssignFolder(row.original, folderId)}
          onNewFolder={() => onNewFolder(row.original)}
        />
      ),
    },
    {
      id: "binPrice",
      accessorFn: row => row.asking_price ?? 0,
      header: t("domains.columns.binPrice"),
      size: 120,
      cell: ({ row }) => (
        <span className="tabular font-medium text-foreground">
          {money(row.original.asking_price, { currency: row.original.purchase_currency })}
        </span>
      ),
    },
    {
      id: "minOffer",
      accessorFn: row => row.min_offer ?? 0,
      header: t("domains.columns.minOffer"),
      size: 120,
      cell: ({ row }) => (
        <span className="tabular text-muted-foreground">
          {money(row.original.min_offer, { currency: row.original.purchase_currency })}
        </span>
      ),
    },
    {
      id: "registrar",
      accessorFn: row => row.registrar ?? "—",
      header: t("domains.columns.registrar"),
      size: 140,
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.registrar ?? "—"}</span>,
    },
    {
      id: "registeredDate",
      accessorFn: row => row.registered_date ?? row.purchase_date ?? "",
      header: t("domains.columns.registeredDate"),
      size: 120,
      cell: ({ row }) => {
        const value = row.original.registered_date ?? row.original.purchase_date;
        return <span className="tabular text-muted-foreground">{value ? formatDate(value) : "—"}</span>;
      },
    },
    {
      id: "expiryDate",
      accessorFn: row => row.expiry_date ?? "",
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
      id: "renewalCost",
      accessorFn: row => row.renewal_cost ?? 0,
      header: t("domains.columns.renewalCost"),
      size: 120,
      cell: ({ row }) => (
        <span className="tabular text-muted-foreground">
          {money(row.original.renewal_cost, { currency: row.original.purchase_currency })}
        </span>
      ),
    },
    {
      id: "autoRenew",
      accessorFn: row => (row.auto_renew ? 1 : 0),
      header: t("domains.columns.autoRenew"),
      size: 80,
      enableSorting: false,
      cell: ({ row }) => (
        <AutoRenewSwitch
          checked={row.original.auto_renew}
          onCheckedChange={value => onQuickUpdate(row.original, { auto_renew: value })}
        />
      ),
    },
    {
      id: "privacy",
      accessorFn: row => (row.privacy ? 1 : 0),
      header: t("domains.columns.privacy"),
      size: 80,
      enableSorting: false,
      cell: ({ row }) => (
        <span className="flex justify-center">
          <FlagToggle
            kind="privacy"
            on={row.original.privacy}
            label={t("domains.detail.privacy")}
            onToggle={() => onQuickUpdate(row.original, { privacy: !row.original.privacy })}
          />
        </span>
      ),
    },
    {
      id: "locked",
      accessorFn: row => (row.locked ? 1 : 0),
      header: t("domains.columns.locked"),
      size: 80,
      enableSorting: false,
      cell: ({ row }) => (
        <span className="flex justify-center">
          <FlagToggle
            kind="locked"
            on={row.original.locked}
            label={t("domains.detail.locked")}
            onToggle={() => onQuickUpdate(row.original, { locked: !row.original.locked })}
          />
        </span>
      ),
    },
    {
      id: "nameservers",
      accessorFn: row => (row.nameservers ?? []).join(", "),
      header: t("domains.columns.nameservers"),
      size: 180,
      enableSorting: false,
      cell: ({ row }) => (
        <NameserversCell nameservers={row.original.nameservers ?? []} onOpen={() => onOpenNameservers(row.original)} />
      ),
    },
    {
      id: "urlForwarding",
      accessorFn: row => row.url_forwarding ?? "",
      header: t("domains.columns.urlForwarding"),
      size: 180,
      cell: ({ row }) => (
        <button
          type="button"
          onClick={event => {
            event.stopPropagation();
            onOpenUrlForwarding(row.original);
          }}
          className="block max-w-[180px] truncate text-start text-2xs text-muted-foreground transition-colors hover:text-foreground"
          title={row.original.url_forwarding ?? undefined}
        >
          {row.original.url_forwarding ?? "—"}
        </button>
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
      id: "estimatedValue",
      accessorFn: row => row.estimated_value ?? 0,
      header: t("domains.columns.estimatedValue"),
      size: 120,
      cell: ({ row }) => (
        <span className="tabular text-muted-foreground">
          {money(row.original.estimated_value, { currency: row.original.purchase_currency })}
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
    {
      id: "actions",
      size: 48,
      enableSorting: false,
      enableHiding: false,
      header: () => <span className="sr-only">{t("common.actions")}</span>,
      cell: ({ row }) => (
        <span className="flex justify-end" onClick={event => event.stopPropagation()}>
          {renderActions(row.original)}
        </span>
      ),
    },
  ];
}

/** Columns shown before the user opens the column picker. */
export const DEFAULT_VISIBLE_COLUMNS = [
  "select",
  "domain",
  "folder",
  "binPrice",
  "minOffer",
  "registrar",
  "registeredDate",
  "expiryDate",
  "renewalCost",
  "autoRenew",
  "privacy",
  "locked",
  "nameservers",
  "actions",
];
