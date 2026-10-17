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
