import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ColumnDef, RowSelectionState, SortingState, VisibilityState } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

export type DataTableProps<TData> = {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  getRowId?: (row: TData) => string;
  onRowClick?: (row: TData) => void;
  isLoading?: boolean;
  emptyState?: ReactNode;
  /** Rendered instead of the table on narrow screens, when provided. */
  renderMobileCard?: (row: TData) => ReactNode;
  onSelectionChange?: (selected: TData[]) => void;
  initialPageSize?: number;
  initialSorting?: SortingState;
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: (visibility: VisibilityState) => void;
  className?: string;
};

const PAGE_SIZE = 25;

export function DataTable<TData>({
  columns,
  data,
  getRowId,
  onRowClick,
  isLoading,
  emptyState,
  renderMobileCard,
  onSelectionChange,
  initialPageSize = PAGE_SIZE,
  initialSorting = [],
  columnVisibility,
  onColumnVisibilityChange,
  className,
}: DataTableProps<TData>) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: initialPageSize });
  // "Show all" puts the whole result set on a single page, ignoring the pager.
  const [showAll, setShowAll] = useState(false);

  const table = useReactTable({
    data,
    columns,
    getRowId,
    state: { sorting, rowSelection, pagination, ...(columnVisibility ? { columnVisibility } : {}) },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    ...(onColumnVisibilityChange
      ? {
          onColumnVisibilityChange: (
            updater: VisibilityState | ((old: VisibilityState) => VisibilityState)
          ) => {
            const current = columnVisibility ?? {};
            onColumnVisibilityChange(typeof updater === "function" ? updater(current) : updater);
          },
        }
      : {}),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const totalRows = table.getFilteredRowModel().rows.length;

  // Keep the page size in step with the mode: every row while "show all" is on
  // (so newly added rows stay visible), the default page size otherwise.
  useEffect(() => {
    setPagination(current => {
      const pageSize = showAll ? Math.max(totalRows, 1) : initialPageSize;
      if (current.pageSize === pageSize) return current;
      return { pageIndex: 0, pageSize };
    });
  }, [showAll, totalRows, initialPageSize]);

  const toggleShowAll = () => setShowAll(current => !current);
  const footerProps = {
    showAll,
    onToggleShowAll: toggleShowAll,
    defaultPageSize: initialPageSize,
  };

  useEffect(() => {
    if (!onSelectionChange) return;
    onSelectionChange(table.getSelectedRowModel().rows.map(row => row.original));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowSelection]);

  if (isMobile && renderMobileCard) {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-3 rounded-lg border border-border bg-card p-4">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          ))}
        </div>
      );
    }
    if (data.length === 0) return <div className={className}>{emptyState}</div>;
    return (
      <div className={cn("space-y-3", className)}>
        {table.getSortedRowModel().rows.map(row => (
          <div
            key={row.id}
            onClick={() => onRowClick?.(row.original)}
            className={cn("rounded-lg", onRowClick && "cursor-pointer")}
          >
            {renderMobileCard(row.original)}
          </div>
        ))}
        <PaginationFooter table={table} {...footerProps} />
      </div>
    );
  }

  return (
    <div className={cn("flex h-full min-h-0 flex-col gap-3", className)}>
      {/*
       * Only this frame scrolls: the page header, the toolbar and the pager
       * stay put while the rows move. The header row sticks to the top of the
       * frame, so the columns never leave the screen either.
       */}
      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-card shadow-xs">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map(header => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <TableHead key={header.id} style={{ width: header.getSize() }}>
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 rounded transition-colors hover:text-foreground"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted === "asc" ? (
                            <ArrowUp className="size-3" />
                          ) : sorted === "desc" ? (
                            <ArrowDown className="size-3" />
                          ) : (
                            <ChevronsUpDown className="size-3 opacity-40" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <TableRow key={index} className="hover:bg-transparent">
                  {table.getAllLeafColumns().map(column => (
                    <TableCell key={column.id}>
                      <Skeleton className="h-3.5 w-full max-w-[120px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={table.getAllLeafColumns().length} className="p-0">
                  {emptyState}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map(row => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={cn(onRowClick && "cursor-pointer")}
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <PaginationFooter
        table={table}
        labels={{ showing: t("common.showing"), of: t("common.of"), page: t("common.page") }}
        {...footerProps}
      />
    </div>
  );
}

function PaginationFooter<TData>({
  table,
  labels,
  showAll,
  onToggleShowAll,
  defaultPageSize,
}: {
  table: import("@tanstack/react-table").Table<TData>;
  labels?: { showing: string; of: string; page: string };
  /** When true the whole result set is on one page. */
  showAll?: boolean;
  onToggleShowAll?: () => void;
  /** The page size to restore when "show all" is switched off. */
  defaultPageSize?: number;
}) {
  const { t } = useTranslation();
  const total = table.getFilteredRowModel().rows.length;
  // While "show all" is on the footer stays visible, so the pager can come back.
  if (!showAll && total <= table.getState().pagination.pageSize && table.getPageCount() <= 1) return null;

  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;

  return (
    <div className="flex shrink-0 flex-col items-center justify-between gap-3 text-xs text-muted-foreground sm:flex-row">
      <span className="tabular">
        {(labels?.showing ?? t("common.showing"))} {pageIndex * pageSize + 1}–
        {Math.min((pageIndex + 1) * pageSize, total)} {labels?.of ?? t("common.of")} {total}
      </span>
      <div className="flex items-center gap-2">
        <span className="tabular">
          {labels?.page ?? t("common.page")} {pageIndex + 1} / {Math.max(table.getPageCount(), 1)}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            {t("common.previous")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            {t("common.next")}
          </Button>
          {onToggleShowAll ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleShowAll}
              aria-pressed={Boolean(showAll)}
              className="ms-1"
            >
              {showAll ? t("common.showPaged", { count: defaultPageSize }) : t("common.showAll")}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
