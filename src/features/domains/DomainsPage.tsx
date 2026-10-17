import { useCallback, useEffect, useMemo, useState } from "react";
import type { VisibilityState } from "@tanstack/react-table";
import { Archive, ArchiveRestore, Download, FolderOpen, Sparkles, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Confetti } from "@/components/shared/Confetti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DomainCard } from "@/features/domains/components/DomainCard";
import { DomainFormDialog } from "@/features/domains/components/DomainFormDialog";
import { ImportDomainsDialog } from "@/features/domains/components/ImportDomainsDialog";
import { DomainSidePeek } from "@/features/domains/components/DomainSidePeek";
import {
  NameserversDialog,
  NewFolderDialog,
  RenewDomainDialog,
  UrlForwardingDialog,
} from "@/features/domains/components/DomainQuickDialogs";
import { RowActionsMenu } from "@/features/domains/components/RowActionsMenu";
import { DomainsToolbar, type DomainView } from "@/features/domains/components/DomainsToolbar";
import { createDomainColumns, DEFAULT_VISIBLE_COLUMNS } from "@/features/domains/components/columns";
import { exportDomains } from "@/features/domains/export";
import { applyFilters, EMPTY_FILTERS, facetValues, type DomainFilters } from "@/features/domains/filters";
import {
  useArchiveDomain,
  useBulkArchiveDomains,
  useBulkRestoreDomains,
  useCreateFolder,
  useDeleteDomain,
  useDomainsQuery,
  useFoldersQuery,
  useLoadDemoData,
  useQuickUpdateDomain,
  useRenewDomain,
  useRestoreDomain,
} from "@/features/domains/queries";
import { deriveDomain, deriveDomains } from "@/lib/domain-rules";
import type { DerivedDomain } from "@/lib/domain-rules";
import { APP_EVENTS, onAppEvent } from "@/lib/events";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useWorkspace } from "@/hooks/useWorkspace";
import { toIsoDate } from "@/lib/format";
import type { DomainUpdate } from "@/types/database";

const DEFAULT_COLUMN_VISIBILITY: VisibilityState = DEFAULT_VISIBLE_COLUMNS.reduce<VisibilityState>(
  (accumulator, id) => ({ ...accumulator, [id]: true }),
  {}
);

export function DomainsPage() {
  const { t } = useTranslation();
  const workspace = useWorkspace().current;
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState<DomainFilters>(EMPTY_FILTERS);
  const [view, setView] = useLocalStorage<DomainView>("domainfolio.domains-view", "table");
  const [columnVisibility, setColumnVisibility] = useLocalStorage<VisibilityState>(
    "domainfolio.domain-columns",
    DEFAULT_COLUMN_VISIBILITY
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<DerivedDomain | null>(null);
  const [soldTarget, setSoldTarget] = useState<DerivedDomain | null>(null);
  const [peekId, setPeekId] = useState<string | null>(null);
  const [selected, setSelected] = useState<DerivedDomain[]>([]);
  const [confettiFire, setConfettiFire] = useState(0);

  // Row-action dialogs
  const [urlTarget, setUrlTarget] = useState<DerivedDomain | null>(null);
  const [nsTarget, setNsTarget] = useState<DerivedDomain | null>(null);
  const [renewTarget, setRenewTarget] = useState<DerivedDomain | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<DerivedDomain | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DerivedDomain | null>(null);
  const [newFolderFor, setNewFolderFor] = useState<DerivedDomain | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState("");

  const { data: rows, isLoading, isError, refetch, isFetching } = useDomainsQuery(filters.includeArchived);
  const { data: folders } = useFoldersQuery();
  const demoMutation = useLoadDemoData();
  const bulkArchive = useBulkArchiveDomains();
  const bulkRestore = useBulkRestoreDomains();
  const quickUpdate = useQuickUpdateDomain(filters.includeArchived);
  const archiveMutation = useArchiveDomain(filters.includeArchived);
  const restoreMutation = useRestoreDomain();
  const deleteMutation = useDeleteDomain();
  const renewMutation = useRenewDomain();
  const createFolder = useCreateFolder();

  const derived = useMemo(() => deriveDomains(rows ?? []), [rows]);
  const filtered = useMemo(() => applyFilters(derived, filters), [derived, filters]);
  const facets = useMemo(() => facetValues(derived), [derived]);

  // A stored visibility map from an earlier version won't know the new columns,
  // so default the keys it's missing rather than hiding them.
  const effectiveColumnVisibility = useMemo(
    () => ({ ...DEFAULT_COLUMN_VISIBILITY, ...columnVisibility }),
    [columnVisibility]
  );

  const peekDomain = useMemo(
    () => derived.find(record => record.id === peekId) ?? null,
    [derived, peekId]
  );

  // Deep link: /domains?focus=<id> opens the side-peek.
  useEffect(() => {
    const focus = searchParams.get("focus");
    if (focus) setPeekId(focus);
  }, [searchParams]);

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
    async (domain: DerivedDomain, reason?: string | null) => {
      await archiveMutation.mutateAsync({ domainId: domain.id, reason: reason ?? null });
      toast(t("domains.detail.archived", { domain: domain.domain }), {
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
        folders={folders ?? []}
        handlers={{
          onRefresh: () => void refetch(),
          onOpenDetail: () => setEditing(domain),
          onOpenUrlForwarding: () => setUrlTarget(domain),
          onOpenNameservers: () => setNsTarget(domain),
          onRenew: () => setRenewTarget(domain),
          onMarkSold: () => setSoldTarget(domain),
          onAssignFolder: folderId => quickUpdateDomain(domain, { folder_id: folderId }),
          onNewFolder: () => {
            setNewFolderFor(domain);
            setNewFolderOpen(true);
          },
          onMarkDropped: () => void runArchive(domain, "dropped"),
          onArchive: () => {
            setArchiveReason("");
            setArchiveTarget(domain);
          },
          onDelete: () => setDeleteTarget(domain),
        }}
      />
    ),
    [folders, quickUpdateDomain, refetch, runArchive]
  );

  const columns = useMemo(
    () =>
      createDomainColumns({
        t,
        folders: folders ?? [],
        onQuickUpdate: quickUpdateDomain,
        onAssignFolder: (domain, folderId) => quickUpdateDomain(domain, { folder_id: folderId }),
        onNewFolder: domain => {
          setNewFolderFor(domain);
          setNewFolderOpen(true);
        },
        onOpenDetail: domain => setEditing(domain),
        onOpenUrlForwarding: domain => setUrlTarget(domain),
        onOpenNameservers: domain => setNsTarget(domain),
        renderActions,
      }),
    [t, folders, quickUpdateDomain, renderActions]
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

  function handlePeek(domain: DerivedDomain) {
    setPeekId(domain.id);
    setSearchParams(params => {
      params.set("focus", domain.id);
      return params;
    });
  }

  function closePeek(open: boolean) {
    if (!open) {
      setPeekId(null);
      setSearchParams(params => {
        params.delete("focus");
        return params;
      });
    }
  }

  async function handleBulkArchive() {
    const ids = selected.map(row => row.id);
    await bulkArchive.mutateAsync({ domainIds: ids });
    toast(t("toast.archived"), {
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
    <div className="space-y-5">
      <Confetti fire={confettiFire} />

      <PageHeader title={t("domains.title")} description={workspace ? t("domains.subtitle") : t("workspace.label")} />

      <DomainsToolbar
        filters={filters}
        onFiltersChange={setFilters}
        facets={facets}
        folders={folders ?? []}
        view={view}
        onViewChange={setView}
        columns={columnPicker}
        columnVisibility={effectiveColumnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
        onExport={runExport}
        onAdd={() => setImportOpen(true)}
      />

      {selected.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-primary-soft/60 px-3 py-2">
          <span className="text-2sm font-medium text-primary">
            {t("domains.bulk.title", { count: selected.length })}
          </span>
          <div className="ms-auto flex flex-wrap items-center gap-2">
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
                <Archive />
                {t("domains.bulk.archive")}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => void exportDomains(selected, "xlsx")}>
              <Download />
              {t("domains.bulk.export")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
              {t("common.clearSelection")}
            </Button>
          </div>
        </div>
      ) : null}

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
          onRowClick={handlePeek}
          onSelectionChange={setSelected}
          columnVisibility={effectiveColumnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
          initialSorting={[{ id: "daysLeft", desc: false }]}
          renderMobileCard={domain => <DomainCard domain={domain} onOpen={() => handlePeek(domain)} />}
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

      <DomainSidePeek
        open={Boolean(peekDomain)}
        onOpenChange={closePeek}
        domain={peekDomain}
        onEdit={domain => {
          setEditing(domain);
        }}
      />

      <DomainFormDialog
        open={createOpen || Boolean(editing) || Boolean(soldTarget)}
        onOpenChange={open => {
          if (!open) {
            setCreateOpen(false);
            setEditing(null);
            setSoldTarget(null);
          }
        }}
        domain={editing ?? soldTarget ?? undefined}
        initialPatch={
          soldTarget ? { status: "sold", soldDate: toIsoDate(new Date()) } : undefined
        }
        onSaved={row => {
          const derivedRow = deriveDomain(row);
          const wasSold = editing?.effectiveStatus === "sold";
          if (derivedRow.effectiveStatus === "sold" && !wasSold) {
            setConfettiFire(value => value + 1);
          }
        }}
      />

      <ImportDomainsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onRequestSingle={() => {
          setEditing(null);
          setCreateOpen(true);
        }}
      />

      {/* ---------------------------- row-action dialogs ---------------------------- */}

      <UrlForwardingDialog
        open={Boolean(urlTarget)}
        onOpenChange={open => {
          if (!open) setUrlTarget(null);
        }}
        domain={urlTarget}
        onSave={async value => {
          if (!urlTarget) return;
          await quickUpdate.mutateAsync({
            previous: urlTarget,
            values: { url_forwarding: value.trim() || null },
          });
          toast.success(t("domains.url.saved"));
        }}
      />

      <NameserversDialog
        open={Boolean(nsTarget)}
        onOpenChange={open => {
          if (!open) setNsTarget(null);
        }}
        domain={nsTarget}
        onSave={async nameservers => {
          if (!nsTarget) return;
          await quickUpdate.mutateAsync({ previous: nsTarget, values: { nameservers } });
          toast.success(t("domains.ns.saved"));
        }}
      />

      <RenewDomainDialog
        open={Boolean(renewTarget)}
        onOpenChange={open => {
          if (!open) setRenewTarget(null);
        }}
        domain={renewTarget}
        currency={renewTarget?.purchase_currency ?? workspace?.default_currency ?? "USD"}
        onConfirm={async ({ renewalCost, note }) => {
          if (!renewTarget) return;
          const updated = await renewMutation.mutateAsync({
            domainId: renewTarget.id,
            renewalCost,
            note,
          });
          toast.success(t("domains.detail.renewed", { domain: updated.domain, date: updated.expiry_date ?? "" }));
        }}
      />

      <NewFolderDialog
        open={newFolderOpen}
        onOpenChange={open => {
          setNewFolderOpen(open);
          if (!open) setNewFolderFor(null);
        }}
        onCreate={async ({ name, color }) => {
          const folder = await createFolder.mutateAsync({ name, color });
          toast.success(t("domains.folder.created", { name: folder.name }));
          if (newFolderFor) {
            await quickUpdate.mutateAsync({ previous: newFolderFor, values: { folder_id: folder.id } });
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        onOpenChange={open => {
          if (!open) setArchiveTarget(null);
        }}
        title={t("domains.detail.archiveTitle")}
        description={t("domains.detail.archiveBody")}
        confirmLabel={t("domains.detail.archive")}
        onConfirm={async () => {
          if (!archiveTarget) return;
          await runArchive(archiveTarget, archiveReason.trim() || null);
          setArchiveTarget(null);
        }}
      >
        <Input
          value={archiveReason}
          onChange={event => setArchiveReason(event.target.value)}
          placeholder={t("domains.detail.archiveReasonPlaceholder")}
          aria-label={t("domains.detail.archiveReason")}
        />
      </ConfirmDialog>

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
