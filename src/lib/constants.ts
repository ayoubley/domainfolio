import type {
  DomainActivityAction,
  DomainStatus,
  RenewalDecision,
  SaleType,
} from "@/types/database";

/** Business enums — the single source of truth for values and defaults. */

export const DOMAIN_STATUSES = ["active", "listed", "sold", "expired"] as const;
export const RENEWAL_DECISIONS = [
  "auto_renew",
  "renew",
  "review",
  "dont_renew",
  "pending",
] as const;
export const SALE_TYPES = ["buy_now", "make_offer", "request_price"] as const;
export const PURCHASE_CURRENCIES = ["USD", "EUR"] as const;
export const ACTIVITY_ACTIONS = [
  "created",
  "updated",
  "sold",
  "renewed",
  "archived",
  "restored",
  "imported",
] as const;

export const NICHES = ["Brandable", "Keyword", "Geo", "Exact Match", "Trend"] as const;

/** Folder palette keys. The Tailwind classes for each live in `folderColorClass`. */
export const FOLDER_COLORS = [
  "slate",
  "blue",
  "violet",
  "amber",
  "red",
  "emerald",
  "rose",
  "cyan",
] as const;
export const DEFAULT_FOLDER_COLOR = "slate";

export const REGISTRY_STATUSES = ["active", "grace", "redemption", "hold", "expired"] as const;
export const DOMAIN_SOURCES = ["manual", "imported"] as const;

export const DEFAULT_STATUS: DomainStatus = "active";
export const DEFAULT_RENEWAL_DECISION: RenewalDecision = "auto_renew";
export const DEFAULT_CURRENCY = "USD";

export const EXPIRY_RISK_BUCKETS = [
  "expired",
  "0-30",
  "31-60",
  "61-90",
  "91-180",
  "180+",
  "missing",
] as const;

/** Non-null assertion helper for switch exhaustiveness. */
export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${String(value)}`);
}

export type { DomainActivityAction, DomainStatus, RenewalDecision, SaleType };

export type FolderColor = (typeof FOLDER_COLORS)[number];
export type RegistryStatus = (typeof REGISTRY_STATUSES)[number];
export type DomainSource = (typeof DOMAIN_SOURCES)[number];
