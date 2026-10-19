import {
  Building2,
  Check,
  ChevronDown,
  Columns3,
  Download,
  FolderTree,
  Globe,
  Plus,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { SearchInput } from "@/components/shared/SearchInput";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { DOMAIN_STATUSES, EXPIRY_RISK_BUCKETS, PURCHASE_CURRENCIES, RENEWAL_DECISIONS } from "@/lib/constants";
import type { ExpiryRisk } from "@/lib/domain-rules";
import type { DomainStatus, FolderRow, PurchaseCurrency, RenewalDecision } from "@/types/database";
import { countActiveFilters, type DomainFilters, type ListedFilter } from "@/features/domains/filters";
import { folderColorClass } from "@/features/domains/folder-colors";
import { cn } from "@/lib/utils";

type Facets = {
  registrars: string[];
  tlds: string[];
  folderIds: string[];
  niches: string[];
  tags: string[];
};

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter(item => item !== value) : [...list, value];
}

function FacetGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

function CheckRow({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean | "indeterminate";
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={value => onCheckedChange(Boolean(value))} />
      <Label htmlFor={id} className="cursor-pointer font-normal text-2sm text-foreground">
        {label}
      </Label>
    </div>
  );
}

export function DomainsToolbar({
  filters,
  onFiltersChange,
  facets,
  folders,
  columns,
  columnVisibility,
  onColumnVisibilityChange,
  onExport,
  onAdd,
  extraActions,
}: {
  filters: DomainFilters;
  onFiltersChange: (filters: DomainFilters) => void;
  facets: Facets;
  folders: FolderRow[];
  columns: { id: string; label: string; hideable: boolean }[];
  columnVisibility: Record<string, boolean>;
  onColumnVisibilityChange: (visibility: Record<string, boolean>) => void;
  onExport: (format: "csv" | "xlsx") => void;
  onAdd: () => void;
  extraActions?: ReactNode;
}) {
  const { t } = useTranslation();
  const activeCount = countActiveFilters(filters);
  const patch = (partial: Partial<DomainFilters>) => onFiltersChange({ ...filters, ...partial });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full sm:min-w-[220px] sm:flex-1">
          <SearchInput
            id="domain-search"
            value={filters.search}
            onValueChange={value => patch({ search: value })}
            placeholder={t("domains.searchPlaceholder")}
          />
        </div>

        {/* Quick facet buttons: Registrar · TLD · Folder */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="md" className={cn(filters.registrar.length > 0 && "border-primary text-primary")}>
              <Building2 />
              <span className="hidden sm:inline">{t("domains.filters.registrar")}</span>
              {filters.registrar.length > 0 ? (
                <span className="tabular rounded-full bg-primary px-1.5 text-2xs font-medium text-primary-foreground">
                  {filters.registrar.length}
                </span>
              ) : (
                <ChevronDown className="size-3.5 opacity-60" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-72 w-56 overflow-y-auto">
            {facets.registrars.length === 0 ? (
              <DropdownMenuItem disabled>{t("domains.filters.noneAvailable")}</DropdownMenuItem>
            ) : (
              facets.registrars.map(registrar => (
                <DropdownMenuCheckboxItem
                  key={registrar}
                  checked={filters.registrar.includes(registrar)}
                  onCheckedChange={() => patch({ registrar: toggle(filters.registrar, registrar) })}
                  onSelect={event => event.preventDefault()}
                >
                  {registrar}
                </DropdownMenuCheckboxItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="md" className={cn(filters.tld.length > 0 && "border-primary text-primary")}>
              <Globe />
              <span className="hidden sm:inline">{t("domains.filters.tld")}</span>
              {filters.tld.length > 0 ? (
                <span className="tabular rounded-full bg-primary px-1.5 text-2xs font-medium text-primary-foreground">
                  {filters.tld.length}
                </span>
              ) : (
                <ChevronDown className="size-3.5 opacity-60" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-72 w-56 overflow-y-auto">
            {facets.tlds.length === 0 ? (
              <DropdownMenuItem disabled>{t("domains.filters.noneAvailable")}</DropdownMenuItem>
            ) : (
              facets.tlds.map(tld => (
                <DropdownMenuCheckboxItem
                  key={tld}
                  checked={filters.tld.includes(tld)}
                  onCheckedChange={() => patch({ tld: toggle(filters.tld, tld) })}
                  onSelect={event => event.preventDefault()}
                >
                  .{tld}
                </DropdownMenuCheckboxItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="md" className={cn(filters.folderId.length > 0 && "border-primary text-primary")}>
              <FolderTree />
              <span className="hidden sm:inline">{t("domains.filters.folder")}</span>
              {filters.folderId.length > 0 ? (
                <span className="tabular rounded-full bg-primary px-1.5 text-2xs font-medium text-primary-foreground">
                  {filters.folderId.length}
                </span>
              ) : (
                <ChevronDown className="size-3.5 opacity-60" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-72 w-56 overflow-y-auto">
            {folders.length === 0 ? (
              <DropdownMenuItem disabled>{t("domains.filters.noneAvailable")}</DropdownMenuItem>
            ) : (
              folders.map(folder => (
                <DropdownMenuCheckboxItem
                  key={folder.id}
                  checked={filters.folderId.includes(folder.id)}
                  onCheckedChange={() => patch({ folderId: toggle(filters.folderId, folder.id) })}
                  onSelect={event => event.preventDefault()}
                >
                  <span className={cn("size-2 rounded-full", folderColorClass(folder.color).dot)} aria-hidden />
                  {folder.name}
                </DropdownMenuCheckboxItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="md">
              <SlidersHorizontal />
              {t("domains.addFilter")}
              {activeCount > 0 ? (
                <span className="tabular ms-0.5 rounded-full bg-primary px-1.5 text-2xs font-medium text-primary-foreground">
                  {activeCount}
                </span>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="max-h-[70vh] w-80 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-2sm font-semibold">{t("common.filters")}</p>
                {activeCount > 0 ? (
                  <Button variant="ghost" size="sm" onClick={() => onFiltersChange({ ...filters, ...resetFacets() })}>
                    <X />
                    {t("common.clearAll")}
                  </Button>
                ) : null}
              </div>

              <FacetGroup title={t("domains.filters.status")}>
                {DOMAIN_STATUSES.map(status => (
                  <CheckRow
                    key={status}
                    id={`f-status-${status}`}
                    label={t(`status.${status}`)}
                    checked={filters.status.includes(status)}
                    onCheckedChange={() => patch({ status: toggle(filters.status, status as DomainStatus) })}
                  />
                ))}
              </FacetGroup>

              <Separator />

              <FacetGroup title={t("domains.filters.risk")}>
                {EXPIRY_RISK_BUCKETS.map(risk => (
                  <CheckRow
                    key={risk}
                    id={`f-risk-${risk}`}
                    label={t(`risk.${risk}`)}
                    checked={filters.risk.includes(risk as ExpiryRisk)}
                    onCheckedChange={() => patch({ risk: toggle(filters.risk, risk as ExpiryRisk) })}
                  />
                ))}
              </FacetGroup>

              <Separator />

              <FacetGroup title={t("domains.filters.decision")}>
                {RENEWAL_DECISIONS.map(decision => (
                  <CheckRow
                    key={decision}
                    id={`f-decision-${decision}`}
                    label={t(`decision.${decision}`)}
                    checked={filters.decision.includes(decision as RenewalDecision)}
                    onCheckedChange={() => patch({ decision: toggle(filters.decision, decision as RenewalDecision) })}
                  />
                ))}
              </FacetGroup>

              {facets.registrars.length > 0 ? (
                <>
                  <Separator />
                  <FacetGroup title={t("domains.filters.registrar")}>
                    {facets.registrars.slice(0, 10).map(registrar => (
                      <CheckRow
                        key={registrar}
                        id={`f-reg-${registrar}`}
                        label={registrar}
                        checked={filters.registrar.includes(registrar)}
                        onCheckedChange={() => patch({ registrar: toggle(filters.registrar, registrar) })}
                      />
                    ))}
                  </FacetGroup>
                </>
              ) : null}

              {facets.tags.length > 0 ? (
                <>
                  <Separator />
                  <FacetGroup title={t("domains.filters.tags")}>
                    <div className="flex flex-wrap gap-1.5">
                      {facets.tags.slice(0, 16).map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => patch({ tags: toggle(filters.tags, tag) })}
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-2xs transition-colors",
                            filters.tags.includes(tag)
                              ? "border-primary bg-primary-soft text-primary"
                              : "border-border-strong text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </FacetGroup>
                </>
              ) : null}

              <Separator />

              <FacetGroup title={t("domains.filters.listed")}>
                <div className="flex flex-wrap gap-1.5">
                  {(["any", "yes", "no"] as ListedFilter[]).map(option => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => patch({ listed: option })}
                      className={cn(
                        "rounded-md border px-2 py-0.5 text-2xs transition-colors",
                        filters.listed === option
                          ? "border-primary bg-primary-soft text-primary"
                          : "border-border-strong text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {option === "any"
                        ? t("domains.filters.any")
                        : option === "yes"
                          ? t("domains.filters.listedYes")
                          : t("domains.filters.listedNo")}
                    </button>
                  ))}
                </div>
              </FacetGroup>

              <FacetGroup title={t("domains.filters.expiringWithin")}>
                <div className="flex flex-wrap gap-1.5">
                  {[30, 60, 90].map(days => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => patch({ expiringWithin: filters.expiringWithin === days ? null : days })}
                      className={cn(
                        "rounded-md border px-2 py-0.5 text-2xs tabular transition-colors",
                        filters.expiringWithin === days
                          ? "border-primary bg-primary-soft text-primary"
                          : "border-border-strong text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {days}d
                    </button>
                  ))}
                </div>
              </FacetGroup>

              <Separator />

              <FacetGroup title={t("domains.filters.currency")}>
                <div className="flex gap-3">
                  {PURCHASE_CURRENCIES.map(code => (
                    <CheckRow
                      key={code}
                      id={`f-cur-${code}`}
                      label={code}
                      checked={filters.currency.includes(code as PurchaseCurrency)}
                      onCheckedChange={() => patch({ currency: toggle(filters.currency, code as PurchaseCurrency) })}
                    />
                  ))}
                </div>
              </FacetGroup>

              <Separator />

              <CheckRow
                id="f-archived"
                label={t("domains.filters.archived")}
                checked={filters.includeArchived}
                onCheckedChange={value => patch({ includeArchived: value })}
              />
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label={t("common.columns")}>
              <Columns3 />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{t("domains.columnPrefs")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {columns
              .filter(column => column.hideable)
              .map(column => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={columnVisibility[column.id] ?? true}
                  onCheckedChange={value =>
                    onColumnVisibilityChange({ ...columnVisibility, [column.id]: Boolean(value) })
                  }
                  onSelect={event => event.preventDefault()}
                >
                  {column.label}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Download />
              <span className="hidden sm:inline">{t("common.export")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onExport("csv")}>CSV</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport("xlsx")}>Excel (.xlsx)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {extraActions}

        <Button variant="primary" onClick={onAdd}>
          <Plus />
          <span className="hidden sm:inline">{t("domains.addDomain")}</span>
        </Button>
      </div>

      {/* Active filter chips */}
      {activeCount > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {filters.status.map(status => (
            <Chip key={status} label={t(`status.${status}`)} onRemove={() => patch({ status: toggle(filters.status, status) })} />
          ))}
          {filters.risk.map(risk => (
            <Chip key={risk} label={t(`risk.${risk}`)} onRemove={() => patch({ risk: toggle(filters.risk, risk) })} />
          ))}
          {filters.decision.map(decision => (
            <Chip
              key={decision}
              label={t(`decision.${decision}`)}
              onRemove={() => patch({ decision: toggle(filters.decision, decision) })}
            />
          ))}
          {filters.registrar.map(registrar => (
            <Chip
              key={registrar}
              label={registrar}
              onRemove={() => patch({ registrar: toggle(filters.registrar, registrar) })}
            />
          ))}
          {filters.tld.map(tld => (
            <Chip key={tld} label={`.${tld}`} onRemove={() => patch({ tld: toggle(filters.tld, tld) })} />
          ))}
          {filters.folderId.map(folderId => (
            <Chip
              key={folderId}
              label={folders.find(folder => folder.id === folderId)?.name ?? folderId}
              onRemove={() => patch({ folderId: toggle(filters.folderId, folderId) })}
            />
          ))}
          {filters.tags.map(tag => (
            <Chip key={tag} label={tag} onRemove={() => patch({ tags: toggle(filters.tags, tag) })} />
          ))}
          {filters.expiringWithin !== null ? (
            <Chip
              label={`≤ ${filters.expiringWithin}d`}
              onRemove={() => patch({ expiringWithin: null })}
            />
          ) : null}
          {filters.listed !== "any" ? (
            <Chip
              label={filters.listed === "yes" ? t("domains.filters.listedYes") : t("domains.filters.listedNo")}
              onRemove={() => patch({ listed: "any" })}
            />
          ) : null}
          {filters.includeArchived ? (
            <Chip label={t("domains.filters.archived")} onRemove={() => patch({ includeArchived: false })} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border-strong bg-card px-2 py-0.5 text-2xs text-foreground">
      <Check className="size-3 text-primary" />
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground transition-colors hover:text-destructive"
        aria-label={`Remove ${label}`}
      >
        <X className="size-3" />
      </button>
    </span>
  );
}

function resetFacets(): Partial<DomainFilters> {
  return {
    status: [],
    risk: [],
    decision: [],
    registrar: [],
    tld: [],
    folderId: [],
    niche: [],
    tags: [],
    currency: [],
    listed: "any",
    expiringWithin: null,
    includeArchived: false,
  };
}
