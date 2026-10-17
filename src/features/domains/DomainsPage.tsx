import { useCallback, useEffect, useMemo, useState } from "react";
import type { VisibilityState } from "@tanstack/react-table";
import { Archive, ArchiveRestore, Download, FolderOpen, Sparkles, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Confetti } from "@/components/shared/Confetti";
import { Button } from "@/components/ui/button";
import { DomainCard } from "@/features/domains/components/DomainCard";
import { DomainFormDialog } from "@/features/domains/components/DomainFormDialog";
import { DomainSidePeek } from "@/features/domains/components/DomainSidePeek";
import { DomainsToolbar, type DomainView } from "@/features/domains/components/DomainsToolbar";
import { createDomainColumns, DEFAULT_VISIBLE_COLUMNS } from "@/features/domains/components/columns";
import { exportDomains } from "@/features/domains/export";
import { applyFilters, EMPTY_FILTERS, facetValues, type DomainFilters } from "@/features/domains/filters";
import {
  useBulkArchiveDomains,
  useBulkRestoreDomains,
  useDomainsQuery,
  useLoadDemoData,
} from "@/features/domains/queries";
import { deriveDomain, deriveDomains } from "@/lib/domain-rules";
import type { DerivedDomain } from "@/lib/domain-rules";
import { APP_EVENTS, onAppEvent } from "@/lib/events";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useWorkspace } from "@/hooks/useWorkspace";

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
  const [editing, setEditing] = useState<DerivedDomain | null>(null);
  const [peekId, setPeekId] = useState<string | null>(null);
  const [selected, setSelected] = useState<DerivedDomain[]>([]);
  const [confettiFire, setConfettiFire] = useState(0);

  const { data: rows, isLoading, isError, refetch, isFetching } = useDomainsQuery(filters.includeArchived);
  const demoMutation = useLoadDemoData();
  const bulkArchive = useBulkArchiveDomains();
  const bulkRestore = useBulkRestoreDomains();

  const derived = useMemo(() => deriveDomains(rows ?? []), [rows]);
  const filtered = useMemo(() => applyFilters(derived, filters), [derived, filters]);
  const facets = useMemo(() => facetValues(derived), [derived]);

  const peekDomain = useMemo(
    () => derived.find(record => record.id === peekId) ?? null,
    [derived, peekId]
  );

  // Deep link: /domains?focus=<id> opens the side-peek.
  useEffect(() => {
    const focus = searchParams.get("focus");
    if (focus) setPeekId(focus);
  }, [searchParams]);

  const columns = useMemo(() => createDomainColumns({ t }), [t]);

  const columnPicker = useMemo(
    () =>
      columns.map(column => ({
        id: column.id ?? "",
        label: typeof column.header === "string" ? column.header : (column.id ?? ""),
        hideable: column.id !== "select" && column.id !== "domain",
      })),
    [columns]
  );

  const runExport = useCallback(
    (format: "csv" | "xlsx") => {
      exportDomains(filtered, format);
      toast.success(t("toast.exported"));
    },
    [filtered, t]
  );

  // Global "export current view" + "/" focus, wired from the shell.
  useEffect(() => {
    const offExport = onAppEvent(APP_EVENTS.exportView, () => runExport("xlsx"));
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
        view={view}
        onViewChange={setView}
        columns={columnPicker}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
        onExport={runExport}
        onAdd={() => {
          setEditing(null);
          setCreateOpen(true);
        }}
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
            <Button size="sm" variant="outline" onClick={() => exportDomains(selected, "xlsx")}>
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
              <Button variant="outline" onClick={() => setCreateOpen(true)}>
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
          columnVisibility={columnVisibility}
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
        open={createOpen || Boolean(editing)}
        onOpenChange={open => {
          if (!open) {
            setCreateOpen(false);
            setEditing(null);
          }
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

      {/* Screen-reader announcement for selection changes. */}
      <span className="sr-only" aria-live="polite">
        {selected.length ? t("domains.bulk.title", { count: selected.length }) : ""}
      </span>
    </div>
  );
}
