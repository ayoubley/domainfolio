import { useCallback, useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ArchiveRestore, PackageOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { useDomainsQuery, useRestoreDomain } from "@/features/domains/queries";
import { deriveDomains, isArchived } from "@/lib/domain-rules";
import type { DerivedDomain } from "@/lib/domain-rules";
import { formatDate, money } from "@/lib/format";

/**
 * The archive: every domain that was dropped, sold or simply set aside. Nothing
 * here is ever deleted, so any row can go straight back to the live portfolio.
 */
export function ArchivePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: rows, isLoading, isError, refetch, isFetching } = useDomainsQuery(true);
  const restore = useRestoreDomain();

  const archived = useMemo(() => deriveDomains(rows ?? []).filter(isArchived), [rows]);

  const handleRestore = useCallback(
    async (domain: DerivedDomain) => {
      await restore.mutateAsync({ domainId: domain.id });
      toast.success(t("domains.detail.restored", { domain: domain.domain }));
    },
    [restore, t]
  );

  const columns = useMemo<ColumnDef<DerivedDomain, unknown>[]>(
    () => [
      {
        id: "domain",
        accessorKey: "domain",
        header: t("domains.columns.domain"),
        size: 320,
        cell: ({ row }) => (
          <span className="flex flex-wrap items-center gap-1.5">
            <span dir="ltr" className="font-medium tabular text-foreground">
              {row.original.domain}
            </span>
            <StatusBadge status={row.original.effectiveStatus} />
          </span>
        ),
      },
      {
        id: "salePrice",
        accessorFn: row => row.sale_price ?? 0,
        header: t("domains.sold.amount"),
        size: 140,
        cell: ({ row }) => (
          <span className="tabular font-medium text-foreground">
            {money(row.original.sale_price, { currency: row.original.purchase_currency })}
          </span>
        ),
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
        id: "archivedAt",
        accessorFn: row => row.archived_at ?? "",
        header: t("archive.archivedOn"),
        size: 130,
        cell: ({ row }) => (
          <span className="tabular text-muted-foreground">
            {row.original.archived_at ? formatDate(row.original.archived_at) : "—"}
          </span>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        enableHiding: false,
        header: t("common.actions"),
        size: 150,
        cell: ({ row }) => (
          <Button variant="outline" size="sm" onClick={() => void handleRestore(row.original)}>
            <ArchiveRestore />
            {t("domains.detail.restore")}
          </Button>
        ),
      },
    ],
    [t, handleRestore]
  );

  return (
    <div className="space-y-5">
      <PageHeader title={t("archive.title")} description={t("archive.subtitle")} />

      {isError ? (
        <ErrorState onRetry={() => void refetch()} retrying={isFetching} />
      ) : (
        <DataTable<DerivedDomain>
          columns={columns}
          data={archived}
          getRowId={row => row.id}
          isLoading={isLoading}
          initialSorting={[{ id: "archivedAt", desc: true }]}
          emptyState={
            <EmptyState
              icon={PackageOpen}
              title={t("archive.emptyTitle")}
              description={t("archive.emptyBody")}
              action={
                <Button variant="outline" size="sm" onClick={() => navigate("/domains")}>
                  {t("nav.domains")}
                </Button>
              }
            />
          }
        />
      )}
    </div>
  );
}
