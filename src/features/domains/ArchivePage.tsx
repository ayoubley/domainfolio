import { useCallback, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ArchiveRestore, PackageOpen, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { createDomainColumns } from "@/features/domains/components/columns";
import {
  useDeleteDomain,
  useDomainsQuery,
  useQuickUpdateDomain,
  useRestoreDomain,
} from "@/features/domains/queries";
import { deriveDomains, isArchived, ownedPositions } from "@/lib/domain-rules";
import type { DerivedDomain } from "@/lib/domain-rules";
import { formatDate } from "@/lib/format";
import type { DomainUpdate } from "@/types/database";

/**
 * The archive: every domain that was set aside from the portfolio. The table is
 * the domains table (same columns, same inline status and auto-renew controls),
 * so a row here is still a real record — archiving never deletes.
 *
 * Deleting from this page is the one irreversible action in the app: the row
 * leaves the database for good, which is why it asks for confirmation first.
 */
export function ArchivePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: rows, isLoading, isError, refetch, isFetching } = useDomainsQuery(true);
  const restore = useRestoreDomain();
  const quickUpdate = useQuickUpdateDomain(true);
  const remove = useDeleteDomain();

  const [selected, setSelected] = useState<DerivedDomain[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const archived = useMemo(() => deriveDomains(rows ?? []).filter(isArchived), [rows]);
  // Numbering and the /domains/<n> link come from the live portfolio, exactly
  // like the domains page, so a number never points at another domain.
  const positions = useMemo(() => ownedPositions(rows ?? []), [rows]);

  const handleRestore = useCallback(
    async (domain: DerivedDomain) => {
      await restore.mutateAsync({ domainId: domain.id });
      toast.success(t("domains.detail.restored", { domain: domain.domain }));
    },
    [restore, t]
  );

  const handleQuickUpdate = useCallback(
    (domain: DerivedDomain, values: DomainUpdate) => {
      quickUpdate.mutate({ previous: domain, values }, { onError: () => toast.error(t("toast.error")) });
    },
    [quickUpdate, t]
  );

  const handleOpenRecord = useCallback(
    (domain: DerivedDomain) => {
      const position = positions.get(domain.id);
      if (position) navigate(`/domains/${position}`);
    },
    [navigate, positions]
  );

  const columns = useMemo<ColumnDef<DerivedDomain, unknown>[]>(() => {
    const table = createDomainColumns({
      t,
      onQuickUpdate: handleQuickUpdate,
      onOpenRecord: handleOpenRecord,
      positions,
      numbering: "sequence",
      renderActions: domain => (
        <Button variant="outline" size="sm" onClick={() => void handleRestore(domain)}>
          <ArchiveRestore />
          {t("domains.detail.restore")}
        </Button>
      ),
    });

    return [
      ...table,
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
    ];
  }, [t, handleQuickUpdate, handleOpenRecord, positions, handleRestore]);

  async function handleDelete() {
    const targets = selected;
    try {
      for (const domain of targets) await remove.mutateAsync(domain);
      toast.success(t("archive.deleted", { count: targets.length }));
      setSelected([]);
      setConfirmDelete(false);
    } catch {
      toast.error(t("toast.error"));
    }
  }

  return (
    // `relative` keeps the absolutely positioned live region inside the page.
    <div className="relative flex flex-col gap-5 md:h-full md:min-h-0">
      <PageHeader title={t("archive.title")} description={t("archive.subtitle")} />

      {selected.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-primary-soft/60 px-3 py-2">
          <span className="text-2sm font-medium text-primary">
            {t("domains.bulk.title", { count: selected.length })}
          </span>
          <div className="ms-auto flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={remove.isPending}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 />
              {t("domains.bulk.delete", { count: selected.length })}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
              {t("common.clearSelection")}
            </Button>
          </div>
        </div>
      ) : null}

      {isError ? (
        <ErrorState onRetry={() => void refetch()} retrying={isFetching} />
      ) : (
        <div className="min-h-0 md:flex-1">
          <DataTable<DerivedDomain>
            columns={columns}
            data={archived}
            getRowId={row => row.id}
            isLoading={isLoading}
            onSelectionChange={setSelected}
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
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        tone="destructive"
        title={t("archive.deleteTitle")}
        description={t("archive.deleteBody")}
        confirmLabel={t("archive.deleteConfirm")}
        onConfirm={handleDelete}
      />

      {/* Screen-reader announcement for selection changes. */}
      <span className="sr-only" aria-live="polite">
        {selected.length ? t("domains.bulk.title", { count: selected.length }) : ""}
      </span>
    </div>
  );
}
