import type { DerivedDomain, ExpiryRisk } from "@/lib/domain-rules";
import type { DomainStatus, PurchaseCurrency, RenewalDecision } from "@/types/database";

export type ListedFilter = "any" | "yes" | "no";

export type DomainFilters = {
  search: string;
  status: DomainStatus[];
  risk: ExpiryRisk[];
  decision: RenewalDecision[];
  registrar: string[];
  niche: string[];
  tags: string[];
  currency: PurchaseCurrency[];
  listed: ListedFilter;
  /** Only show domains expiring within N days (null = no constraint). */
  expiringWithin: number | null;
  includeArchived: boolean;
};

export const EMPTY_FILTERS: DomainFilters = {
  search: "",
  status: [],
  risk: [],
  decision: [],
  registrar: [],
  niche: [],
  tags: [],
  currency: [],
  listed: "any",
  expiringWithin: null,
  includeArchived: false,
};

export function countActiveFilters(filters: DomainFilters) {
  let count = 0;
  if (filters.status.length) count += 1;
  if (filters.risk.length) count += 1;
  if (filters.decision.length) count += 1;
  if (filters.registrar.length) count += 1;
  if (filters.niche.length) count += 1;
  if (filters.tags.length) count += 1;
  if (filters.currency.length) count += 1;
  if (filters.listed !== "any") count += 1;
  if (filters.expiringWithin !== null) count += 1;
  if (filters.includeArchived) count += 1;
  return count;
}

/** Pure filter predicate — used by both the table and the CSV export. */
export function matchesFilters(record: DerivedDomain, filters: DomainFilters): boolean {
  if (!filters.includeArchived && record.archived_at) return false;

  const term = filters.search.trim().toLowerCase();
  if (term) {
    const haystack = [
      record.domain,
      record.registrar,
      record.niche,
      record.sale_platform,
      record.acquisition_source,
      ...(record.tags ?? []),
      ...(record.listed_on ?? []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(term)) return false;
  }

  if (filters.status.length && !filters.status.includes(record.effectiveStatus)) return false;
  if (filters.risk.length && !filters.risk.includes(record.expiryRisk)) return false;
  if (filters.decision.length && !filters.decision.includes(record.renewal_decision)) return false;
  if (filters.registrar.length && !filters.registrar.includes(record.registrar ?? "")) return false;
  if (filters.niche.length && !filters.niche.includes(record.niche ?? "")) return false;
  if (filters.currency.length && !filters.currency.includes(record.purchase_currency)) return false;

  if (filters.tags.length) {
    const recordTags = new Set((record.tags ?? []).map(tag => tag.toLowerCase()));
    if (!filters.tags.some(tag => recordTags.has(tag.toLowerCase()))) return false;
  }

  if (filters.listed !== "any") {
    const isListed = (record.listed_on?.length ?? 0) > 0 || record.effectiveStatus === "listed";
    if (filters.listed === "yes" && !isListed) return false;
    if (filters.listed === "no" && isListed) return false;
  }

  if (filters.expiringWithin !== null) {
    if (record.daysLeft === null || record.daysLeft < 0 || record.daysLeft > filters.expiringWithin) return false;
  }

  return true;
}

export function applyFilters(records: DerivedDomain[], filters: DomainFilters): DerivedDomain[] {
  return records.filter(record => matchesFilters(record, filters));
}

/** Distinct values for the facet dropdowns, drawn from the current portfolio. */
export function facetValues(records: DerivedDomain[]) {
  const registrars = new Set<string>();
  const niches = new Set<string>();
  const tags = new Set<string>();
  for (const record of records) {
    if (record.registrar) registrars.add(record.registrar);
    if (record.niche) niches.add(record.niche);
    for (const tag of record.tags ?? []) tags.add(tag);
  }
  return {
    registrars: [...registrars].sort((a, b) => a.localeCompare(b)),
    niches: [...niches].sort((a, b) => a.localeCompare(b)),
    tags: [...tags].sort((a, b) => a.localeCompare(b)),
  };
}
