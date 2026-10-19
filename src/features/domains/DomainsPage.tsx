import { useCallback, useEffect, useMemo, useState } from "react";
import type { VisibilityState } from "@tanstack/react-table";
import { ArchiveRestore, Download, FolderOpen, Sparkles, Tag, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Confetti } from "@/components/shared/Confetti";
import { Button } from "@/components/ui/button";
import { DomainCard } from "@/features/domains/components/DomainCard";
import { DomainFormDialog } from "@/features/domains/components/DomainFormDialog";
import { ImportDomainsDialog } from "@/features/domains/components/ImportDomainsDialog";
import {
  MarkAsSoldDialog,
  NotesDialog,
  PurchaseDetailsDialog,
} from "@/features/domains/components/DomainQuickDialogs";
import { RowActionsMenu } from "@/features/domains/components/RowActionsMenu";
import { SelectionBar } from "@/features/domains/components/SelectionBar";
import { DomainsToolbar } from "@/features/domains/components/DomainsToolbar";
import { createDomainColumns, DEFAULT_VISIBLE_COLUMNS } from "@/features/domains/components/columns";
import { exportDomains } from "@/features/domains/export";
import { applyFilters, EMPTY_FILTERS, facetValues, type DomainFilters } from "@/features/domains/filters";
import {
  useArchiveDomain,
  useBulkArchiveDomains,
  useBulkRestoreDomains,
  useDeleteDomain,
  useDomainsQuery,
  useFoldersQuery,
  useLoadDemoData,
  useQuickUpdateDomain,
  useRestoreDomain,
} from "@/features/domains/queries";
import { deriveDomain, deriveDomains, isOwned, ownedPositions } from "@/lib/domain-rules";
import type { DerivedDomain } from "@/lib/domain-rules";
import { APP_EVENTS, onAppEvent } from "@/lib/events";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useWorkspace } from "@/hooks/useWorkspace";
import type { DomainUpdate } from "@/types/database";

const DEFAULT_COLUMN_VISIBILITY: VisibilityState = DEFAULT_VISIBLE_COLUMNS.reduce<VisibilityState>(
  (accumulator, id) => ({ ...accumulator, [id]: true }),
  {}
);

export function DomainsPage() {
  const { t } = useTranslation();
  const workspace = useWorkspace().current;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [filters, setFilters] = useState<DomainFilters>(EMPTY_FILTERS);
  const [columnVisibility, setColumnVisibility] = useLocalStorage<VisibilityState>(
    "domainfolio.domain-columns",
    DEFAULT_COLUMN_VISIBILITY
  );

  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<DerivedDomain | null>(null);
  const [soldTarget, setSoldTarget] = useState<DerivedDomain | null>(null);
  const [selected, setSelected] = useState<DerivedDomain[]>([]);
  const [confettiFire, setConfettiFire] = useState(0);

  // Row-action dialogs
  const [purchaseTarget, setPurchaseTarget] = useState<DerivedDomain | null>(null);
  const [notesTarget, setNotesTarget] = useState<DerivedDomain | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DerivedDomain | null>(null);

  const { data: rows, isLoading, isError, refetch, isFetching } = useDomainsQuery(filters.includeArchived);
  // The numbering and the /domains/<n> links always come from the active
  // portfolio, so a number never points at a different domain because of a
  // filter or the archive toggle.
  const { data: activeRows } = useDomainsQuery();
  const { data: folders } = useFoldersQuery();
  const demoMutation = useLoadDemoData();
  const bulkArchive = useBulkArchiveDomains();
  const bulkRestore = useBulkRestoreDomains();
  const quickUpdate = useQuickUpdateDomain(filters.includeArchived);
  const archiveMutation = useArchiveDomain(filters.includeArchived);
  const restoreMutation = useRestoreDomain();
  const deleteMutation = useDeleteDomain();

  const derived = useMemo(() => deriveDomains(rows ?? []), [rows]);
  // Sold and expired domains have their own pages, so the table shows what is
  // still owned. The rows are only filtered out — never deleted.
  const owned = useMemo(() => derived.filter(isOwned), [derived]);
  const filtered = useMemo(() => applyFilters(owned, filters), [owned, filters]);
  const facets = useMemo(() => facetValues(owned), [owned]);
  const positions = useMemo(() => ownedPositions(activeRows ?? []), [activeRows]);

  // A stored visibility map from an earlier version won't know the new columns,
  // so default the keys it's missing rather than hiding them.
  const effectiveColumnVisibility = useMemo(
    () => ({ ...DEFAULT_COLUMN_VISIBILITY, ...columnVisibility }),
    [columnVisibility]
  );

  // Deep link: /domains?focus=<id> opens the domain's own page. The table itself
  // never opens anything — a domain is edited from its ⋯ menu.
  useEffect(() => {
    const focus = searchParams.get("focus");
    if (!focus) return;
    const position = positions.get(focus);
    if (position) navigate(`/domains/${position}`, { replace: true });
  }, [searchParams, positions, navigate]);

  const quickUpdateDomain = useCallback(
    (domain: DerivedDomain, values: DomainUpdate) => {
      quickUpdate.mutate(
        { previous: domain, values },
        { onError: () => toast.error(t("toast.error")) }
      );
    },
    [quickUpdate, t]
  );

  const runArchive = useCallback(
    async (domain: DerivedDomain, reason?: string | null, message?: string) => {
      await archiveMutation.mutateAsync({ domainId: domain.id, reason: reason ?? null });
      toast(message ?? t("domains.detail.archived", { domain: domain.domain }), {
        action: {
          label: t("common.undo"),
          onClick: () => {
            void restoreMutation.mutateAsync({ domainId: domain.id }).then(() => toast.success(t("toast.restored")));
          },
        },
      });
    },
    [archiveMutation, restoreMutation, t]
  );

  const renderActions = useCallback(
    (domain: DerivedDomain) => (
      <RowActionsMenu
        domain={domain}
        handlers={{
          onPurchaseDetails: () => setPurchaseTarget(domain),
          onNotes: () => setNotesTarget(domain),
          onMarkSold: () => setSoldTarget(domain),
          onDelete: () => setDeleteTarget(domain),
        }}
      />
    ),
    []
  );

  const columns = useMemo(
    () =>
      createDomainColumns({
        t,
        onQuickUpdate: quickUpdateDomain,
        onOpenRecord: domain => {
          const position = positions.get(domain.id);
          if (position) navigate(`/domains/${position}`);
        },
        positions,
        renderActions,
      }),
    [t, quickUpdateDomain, positions, renderActions, navigate]
  );

  const columnPicker = useMemo(
    () =>
      columns.map(column => ({
        id: column.id ?? "",
        label: typeof column.header === "string" ? column.header : (column.id ?? ""),
        hideable: column.enableHiding !== false,
      })),
    [columns]
  );

  const runExport = useCallback(
    async (format: "csv" | "xlsx") => {
      await exportDomains(filtered, format);
      toast.success(t("toast.exported"));
    },
    [filtered, t]
  );

  // Global "export current view" + "/" focus, wired from the shell.
  useEffect(() => {
    const offExport = onAppEvent(APP_EVENTS.exportView, () => void runExport("xlsx"));
    const offFocus = onAppEvent(APP_EVENTS.focusSearch, () => {
      document.getElementById("domain-search")?.focus();
    });
    return () => {
      offExport();
      offFocus();
    };
  }, [runExport]);

  async function handleBulkArchive() {
    const ids = selected.map(row => row.id);
    await bulkArchive.mutateAsync({ domainIds: ids });
    toast(t("toast.movedToArchive", { count: ids.length }), {
      action: {
        label: t("common.undo"),
        onClick: () => {
          void bulkRestore.mutateAsync(ids).then(() => toast.success(t("toast.restored")));
        },
      },
    });
    setSelected([]);
  }

  const isEmptyPortfolio = derived.length === 0 && !isLoading;

  return (
    // `relative` keeps the screen-reader live region (which is absolutely
    // positioned) inside the page, so it can never stretch the document and
    // leave an empty scroll area under the app.
    <div className="relative flex flex-col gap-5 md:h-full md:min-h-0">
      <Confetti fire={confettiFire} />

      <PageHeader title={t("domains.title")} description={workspace ? t("domains.subtitle") : t("workspace.label")} />

      <DomainsToolbar
        filters={filters}
        onFiltersChange={setFilters}
        facets={facets}
        folders={folders ?? []}
        columns={columnPicker}
        columnVisibility={effectiveColumnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
        onExport={runExport}
        onAdd={() => setImportOpen(true)}
      />

      <SelectionBar count={selected.length} onClear={() => setSelected([])}>
        {filters.includeArchived ? (
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              await bulkRestore.mutateAsync(selected.map(row => row.id));
              toast.success(t("toast.restored"));
              setSelected([]);
            }}
          >
            <ArchiveRestore />
            {t("domains.bulk.restore")}
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={handleBulkArchive}>
            <Trash2 />
            {t("domains.bulk.delete", { count: selected.length })}
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => void exportDomains(selected, "xlsx")}>
          <Download />
          {t("domains.bulk.export")}
        </Button>
      </SelectionBar>

      <div className="min-h-0 md:flex-1">
        {isError ? (
          <ErrorState onRetry={() => void refetch()} retrying={isFetching} />
        ) : isEmptyPortfolio ? (
          <div className="rounded-lg border border-dashed border-border-strong bg-card">
            <EmptyState
              icon={Tag}
              title={t("domains.emptyTitle")}
              description={t("domains.emptyBody")}
              action={
                <Button
                  variant="primary"
                  onClick={async () => {
                    const count = await demoMutation.mutateAsync();
                    toast.success(t("domains.demoLoaded", { count }));
                  }}
                  loading={demoMutation.isPending}
                >
                  <Sparkles />
                  {t("domains.loadDemo")}
                </Button>
              }
              secondaryAction={
                <Button variant="outline" onClick={() => setImportOpen(true)}>
                  {t("domains.addDomain")}
                </Button>
              }
            />
          </div>
        ) : (
          <DataTable<DerivedDomain>
            columns={columns}
            data={filtered}
            getRowId={row => row.id}
            isLoading={isLoading}
            onSelectionChange={setSelected}
            columnVisibility={effectiveColumnVisibility}
            onColumnVisibilityChange={setColumnVisibility}
            initialSorting={[{ id: "expiryDate", desc: false }]}
            renderMobileCard={domain => <DomainCard domain={domain} />}
            emptyState={
              <EmptyState
                compact
                icon={FolderOpen}
                title={t("domains.noResults")}
                description={t("domains.noResultsHint")}
                action={
                  <Button variant="outline" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>
                    {t("common.clearAll")}
                  </Button>
                }
              />
            }
          />
        )}
      </div>

      <DomainFormDialog
        open={Boolean(editing)}
        onOpenChange={open => {
          if (!open) setEditing(null);
        }}
        domain={editing ?? undefined}
        onSaved={row => {
          const derivedRow = deriveDomain(row);
          const wasSold = editing?.effectiveStatus === "sold";
          if (derivedRow.effectiveStatus === "sold" && !wasSold) {
            setConfettiFire(value => value + 1);
          }
        }}
      />

      <MarkAsSoldDialog
        open={Boolean(soldTarget)}
        onOpenChange={open => {
          if (!open) setSoldTarget(null);
        }}
        domain={soldTarget}
        onConfirm={async ({ soldDate, salePrice, currency, notes }) => {
          if (!soldTarget) return;
          await quickUpdate.mutateAsync({
            previous: soldTarget,
            values: {
              status: "sold",
              sold_date: soldDate,
              sale_price: salePrice,
              purchase_currency: currency,
              notes: notes || null,
            },
          });
          await runArchive(soldTarget, "sold", t("domains.sold.done", { domain: soldTarget.domain }));
          setSoldTarget(null);
          // The sale is recorded on its own page.
          navigate("/sales");
        }}
      />

      <ImportDomainsDialog open={importOpen} onOpenChange={setImportOpen} />

      {/* ---------------------------- row-action dialogs ---------------------------- */}

      <PurchaseDetailsDialog
        open={Boolean(purchaseTarget)}
        onOpenChange={open => {
          if (!open) setPurchaseTarget(null);
        }}
        domain={purchaseTarget}
        onSave={async ({ purchasePrice, purchaseDate, registrar, currency }) => {
          if (!purchaseTarget) return;
          await quickUpdate.mutateAsync({
            previous: purchaseTarget,
            values: {
              purchase_price: purchasePrice,
              purchase_date: purchaseDate,
              registrar: registrar || null,
              purchase_currency: currency,
            },
          });
          toast.success(t("domains.detail.updated", { domain: purchaseTarget.domain }));
        }}
      />

      <NotesDialog
        open={Boolean(notesTarget)}
        onOpenChange={open => {
          if (!open) setNotesTarget(null);
        }}
        domain={notesTarget}
        onSave={async notes => {
          if (!notesTarget) return;
          await quickUpdate.mutateAsync({
            previous: notesTarget,
            values: { notes: notes || null },
          });
          toast.success(t("domains.detail.updated", { domain: notesTarget.domain }));
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={open => {
          if (!open) setDeleteTarget(null);
        }}
        tone="destructive"
        title={t("domains.detail.deleteTitle")}
        description={t("domains.detail.deleteBody", { domain: deleteTarget?.domain ?? "" })}
        confirmLabel={t("common.delete")}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteMutation.mutateAsync(deleteTarget);
          toast.success(t("domains.detail.deleted", { domain: deleteTarget.domain }));
          setDeleteTarget(null);
        }}
      />

      {/* Screen-reader announcement for selection changes. */}
      <span className="sr-only" aria-live="polite">
        {selected.length ? t("domains.bulk.title", { count: selected.length }) : ""}
      </span>
    </div>
  );
}
