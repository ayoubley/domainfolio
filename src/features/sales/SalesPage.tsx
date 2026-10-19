import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { BadgeDollarSign, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { DomainFormDialog } from "@/features/domains/components/DomainFormDialog";
import { SelectionBar, selectColumn } from "@/features/domains/components/SelectionBar";
import { useDeleteDomain, useDomainsQuery } from "@/features/domains/queries";
import { deriveDomains, isSold } from "@/lib/domain-rules";
import type { DerivedDomain } from "@/lib/domain-rules";
import { formatDate, money } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Sold domains. A domain lands here the moment it is marked as sold — from the
 * row menu or from the edit form — and leaves the Domains list at the same
 * instant. Nothing is deleted: the purchase record and the archive entry stay.
 * The pencil edits the record in place, through the same form as everywhere else.
 */
export function SalesPage() {
  const { t } = useTranslation();
  const { data: rows, isLoading, isError, refetch, isFetching } = useDomainsQuery(true);

  const sold = useMemo(() => deriveDomains(rows ?? []).filter(isSold), [rows]);
  const [editing, setEditing] = useState<DerivedDomain | null>(null);
  const [selected, setSelected] = useState<DerivedDomain[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const remove = useDeleteDomain();

  const columns = useMemo<ColumnDef<DerivedDomain, unknown>[]>(
    () => [
      selectColumn(t),
      {
        id: "domain",
        accessorKey: "domain",
        header: t("domains.columns.domain"),
        size: 280,
        cell: ({ row }) => (
          <span className="flex flex-wrap items-center gap-1.5">
            <span dir="ltr" className="font-medium tabular text-foreground">
              {row.original.domain}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              aria-label={t("common.edit")}
              onClick={() => setEditing(row.original)}
            >
              <Pencil className="size-3.5" />
            </Button>
          </span>
        ),
      },
      {
        id: "status",
        accessorFn: row => row.effectiveStatus,
        header: t("status.label"),
        size: 140,
        cell: ({ row }) => <StatusBadge status={row.original.effectiveStatus} />,
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
      {
        id: "saleAmount",
        accessorFn: row => row.proceeds ?? 0,
        header: t("domains.sold.amount"),
        size: 130,
        cell: ({ row }) => (
          <span className="tabular font-medium text-foreground">
            {money(row.original.proceeds, { currency: row.original.purchase_currency })}
          </span>
        ),
      },
      {
        id: "salePlatform",
        accessorFn: row => row.sale_platform ?? "",
        header: t("domains.form.salePlatform"),
        size: 140,
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.sale_platform ?? "—"}</span>
        ),
      },
      {
        id: "profit",
        accessorFn: row => row.netProfit ?? 0,
        header: t("domains.detail.profit"),
        size: 130,
        cell: ({ row }) => {
          const profit = row.original.netProfit;
          return (
            <span
              className={cn(
                "tabular font-medium",
                profit === null ? "text-muted-foreground" : profit < 0 ? "text-negative" : "text-positive"
              )}
            >
              {money(profit, { currency: row.original.purchase_currency })}
            </span>
          );
        },
      },
      {
        id: "soldDate",
        accessorFn: row => row.sold_date ?? "",
        header: t("domains.sold.date"),
        size: 130,
        cell: ({ row }) => (
          <span className="tabular text-muted-foreground">
            {row.original.sold_date ? formatDate(row.original.sold_date) : "—"}
          </span>
        ),
      },
      {
        id: "notes",
        accessorFn: row => row.notes ?? "",
        header: t("domains.form.notes"),
        size: 220,
        cell: ({ row }) => {
          const notes = row.original.notes;
          if (!notes) return <span className="text-muted-foreground">—</span>;
          return (
            <span className="block max-w-[220px] truncate text-muted-foreground" title={notes}>
              {notes}
            </span>
          );
        },
      },
    ],
    [t]
  );

  async function handleDelete() {
    const targets = selected;
    try {
      for (const domain of targets) await remove.mutateAsync(domain);
      toast.success(t("domains.bulk.deleted", { count: targets.length }));
      setSelected([]);
      setConfirmDelete(false);
    } catch {
      toast.error(t("toast.error"));
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title={t("sales.title")} description={t("sales.subtitle")} />

      <SelectionBar count={selected.length} onClear={() => setSelected([])}>
        <Button
          size="sm"
          variant="outline"
          disabled={remove.isPending}
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 />
          {t("domains.bulk.delete", { count: selected.length })}
        </Button>
      </SelectionBar>

      {isError ? (
        <ErrorState onRetry={() => void refetch()} retrying={isFetching} />
      ) : (
        <DataTable<DerivedDomain>
          columns={columns}
          data={sold}
          getRowId={row => row.id}
          isLoading={isLoading}
          onSelectionChange={setSelected}
          initialSorting={[{ id: "soldDate", desc: true }]}
          emptyState={
            <EmptyState icon={BadgeDollarSign} title={t("sales.emptyTitle")} description={t("sales.emptyBody")} />
          }
        />
      )}

      <DomainFormDialog open={Boolean(editing)} onOpenChange={open => !open && setEditing(null)} domain={editing} />

      {/* Deleting from a list is final — the row leaves the database. */}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t("domains.bulk.deleteTitle")}
        description={t("domains.bulk.deleteBody", { count: selected.length })}
        confirmLabel={t("domains.bulk.deleteConfirm")}
        tone="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
