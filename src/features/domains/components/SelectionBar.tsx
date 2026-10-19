import type { ColumnDef } from "@tanstack/react-table";
import type { ReactNode } from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import type { DerivedDomain } from "@/lib/domain-rules";

/**
 * The bulk-selection pair: the tick-box column and the bar that appears once
 * something is ticked. Every list page uses the same two, so ticking rows and
 * acting on them reads the same wherever you are.
 */
export function selectColumn(t: TFunction): ColumnDef<DerivedDomain, unknown> {
  return {
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
  };
}

export function SelectionBar({
  count,
  onClear,
  children,
}: {
  count: number;
  onClear: () => void;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  if (count === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-primary-soft/60 px-3 py-2">
      <span className="text-2sm font-medium text-primary">{t("domains.bulk.title", { count })}</span>
      <div className="ms-auto flex flex-wrap items-center gap-2">
        {children}
        <Button size="sm" variant="ghost" onClick={onClear}>
          {t("common.clearSelection")}
        </Button>
      </div>
    </div>
  );
}
