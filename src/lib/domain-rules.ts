/**
 * DomainFolio business rules.
 *
 * Ported *exactly* from the previous implementation so behaviour does not drift:
 *  - dates are UTC calendar days
 *  - expiry auto-fills to purchase + 1 year (29 Feb → 28 Feb)
 *  - effective status is derived, not stored
 *  - net profit uses source proceeds minus purchase price, and no fee,
 *    commission or renewal cost is ever invented
 *  - ROI is null when purchase price is missing or zero
 */

import { parseUtcDate } from "./format";
import type { DomainRow, DomainStatus, RenewalDecision } from "@/types/database";

export type ExpiryRisk = "expired" | "0-30" | "31-60" | "61-90" | "91-180" | "180+" | "missing";

/** Registry lifecycle tone shown as a badge next to the domain name. */
export type LifecycleTone = "redemption" | "expired" | "grace" | "hold";

export type RecommendedAction =
  | "renew"
  | "review"
  | "dont_renew"
  | "list_for_sale"
  | "hold"
  | "already_sold";

export type QualityIssue =
  | "missingDomain"
  | "missingPurchaseDate"
  | "missingExpiryDate"
  | "missingPurchasePrice"
  | "missingRenewalCost"
  | "missingSoldDate"
  | "missingSalePrice"
  | "missingTld";

export type DerivedDomain = DomainRow & {
  /** Calendar days until expiry (negative when already expired). */
  daysLeft: number | null;
  expiryRisk: ExpiryRisk;
  /** Status shown to the user, derived from sale, expiry and listing state. */
  effectiveStatus: DomainStatus;
  /** net_proceeds ?? sale_price */
  proceeds: number | null;
  netProfit: number | null;
  roi: number | null;
  holdingDays: number | null;
  qualityIssues: QualityIssue[];
  recommendedAction: RecommendedAction;
  /** Registry lifecycle tone (redemption/expired/grace/hold). Null = healthy. */
  lifecycle: LifecycleTone | null;
};

/* ------------------------------- primitives ------------------------------- */

/** Coerce a possibly-string numeric column into a finite number or null. */
export function moneyNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Trim, lowercase and strip a trailing dot so "Example.COM." === "example.com". */
export function normalizeDomain(value: string): string {
  return value.trim().toLowerCase().replace(/\.$/, "");
}

const DOMAIN_NAME_PATTERN = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

/** True when `value` normalises to a syntactically valid domain name. */
export function isValidDomainName(value: string): boolean {
  return DOMAIN_NAME_PATTERN.test(normalizeDomain(value));
}

/** The suffix after the final dot, including the dot. Null when absent. */
export function getTld(domain: string): string | null {
  const normalized = domain.trim().toLowerCase();
  const lastDot = normalized.lastIndexOf(".");
  return lastDot > 0 && lastDot < normalized.length - 1 ? normalized.slice(lastDot) : null;
}

/**
 * Same calendar day one year later. Leap-day purchases clamp to 28 Feb, and
 * malformed input returns an empty string rather than an Invalid Date.
 */
export function expiryAfterOneYear(purchaseDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate)) return "";
  const [year, month, day] = purchaseDate.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year + 1, month, 0)).getUTCDate();
  return `${year + 1}-${String(month).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

/** True only when both dates exist and expiry is not strictly after purchase. */
export function hasInvalidDateOrder(
  purchaseDate?: string | null,
  expiryDate?: string | null
): boolean {
  return Boolean(purchaseDate && expiryDate && expiryDate <= purchaseDate);
}

function dayStart(input: Date): number {
  return Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate());
}

export function calculateDaysLeft(
  expiryDate: string | Date | null,
  now: Date = new Date()
): number | null {
  const expiry = parseUtcDate(expiryDate);
  if (!expiry) return null;
  return Math.round((dayStart(expiry) - dayStart(now)) / 86_400_000);
}

export function getExpiryRisk(daysLeft: number | null): ExpiryRisk {
  if (daysLeft === null) return "missing";
  if (daysLeft < 0) return "expired";
  if (daysLeft <= 30) return "0-30";
  if (daysLeft <= 60) return "31-60";
  if (daysLeft <= 90) return "61-90";
  if (daysLeft <= 180) return "91-180";
  return "180+";
}

/** Maps a stored registry status to the lifecycle badge tone. Healthy → null. */
export function domainLifecycle(registryStatus: string | null): LifecycleTone | null {
  switch (registryStatus) {
    case "redemption":
      return "redemption";
    case "expired":
      return "expired";
    case "grace":
      return "grace";
    case "hold":
      return "hold";
    default:
      return null;
  }
}

const ROUND = (value: number) => Number(value.toFixed(2));

/* ------------------------------ derived record ----------------------------- */

export function deriveDomain(record: DomainRow, now: Date = new Date()): DerivedDomain {
  const purchasePrice = moneyNumber(record.purchase_price);
  const renewalCost = moneyNumber(record.renewal_cost);
  const askingPrice = moneyNumber(record.asking_price);
  const salePrice = moneyNumber(record.sale_price);
  const netProceeds = moneyNumber(record.net_proceeds);
  const estimatedValue = moneyNumber(record.estimated_value);

  const daysLeft = calculateDaysLeft(record.expiry_date, now);
  const expiryRisk = getExpiryRisk(daysLeft);

  // Precedence: a sale wins, then expiry (by date or by an explicit expiry
  // status), then a pause, then a listing, otherwise plain owned.
  const effectiveStatus: DomainStatus =
    record.sold_date || record.status === "sold"
      ? "sold"
      : expiryRisk === "expired" || record.status === "expired"
        ? "expired"
        : record.status === "hold"
          ? "hold"
          : record.status === "listed" || (record.listed_on?.length ?? 0) > 0
            ? "listed"
            : "active";

  const proceeds = netProceeds ?? salePrice;

  const netProfit =
    effectiveStatus === "sold" && proceeds !== null && purchasePrice !== null
      ? ROUND(proceeds - purchasePrice)
      : null;

  const roi =
    netProfit !== null && purchasePrice !== null && purchasePrice !== 0
      ? ROUND((netProfit / purchasePrice) * 100)
      : null;

  const purchaseDate = parseUtcDate(record.purchase_date);
  const soldDate = parseUtcDate(record.sold_date);
  const holdingDays =
    purchaseDate && soldDate ? Math.round((dayStart(soldDate) - dayStart(purchaseDate)) / 86_400_000) : null;

  const qualityIssues: QualityIssue[] = [];
  if (!record.domain.trim()) qualityIssues.push("missingDomain");
  if (!record.purchase_date) qualityIssues.push("missingPurchaseDate");
  if (!record.expiry_date) qualityIssues.push("missingExpiryDate");
  if (purchasePrice === null) qualityIssues.push("missingPurchasePrice");
  if (renewalCost === null) qualityIssues.push("missingRenewalCost");
  if (effectiveStatus === "sold" && !record.sold_date) qualityIssues.push("missingSoldDate");
  if (effectiveStatus === "sold" && salePrice === null) qualityIssues.push("missingSalePrice");
  if (!getTld(record.domain)) qualityIssues.push("missingTld");

  const decision: RenewalDecision = record.renewal_decision;
  const recommendedAction: RecommendedAction =
    effectiveStatus === "sold"
      ? "already_sold"
      : expiryRisk === "expired" || decision === "dont_renew"
        ? "dont_renew"
        : decision === "renew" || decision === "auto_renew"
          ? "renew"
          : expiryRisk === "0-30" || decision === "review" || decision === "pending"
            ? "review"
            : (record.listed_on?.length ?? 0) === 0
              ? "list_for_sale"
              : "hold";

  return {
    ...record,
    purchase_price: purchasePrice,
    renewal_cost: renewalCost,
    asking_price: askingPrice,
    sale_price: salePrice,
    net_proceeds: netProceeds,
    estimated_value: estimatedValue,
    min_offer: moneyNumber(record.min_offer),
    daysLeft,
    expiryRisk,
    effectiveStatus,
    proceeds,
    netProfit,
    roi,
    holdingDays,
    qualityIssues,
    recommendedAction,
    lifecycle: domainLifecycle(record.registry_status),
  };
}

export function deriveDomains(records: DomainRow[], now: Date = new Date()): DerivedDomain[] {
  return records.map(record => deriveDomain(record, now));
}

/* -------------------------------- portfolio -------------------------------- */

export type PortfolioSummary = {
  totalDomains: number;
  totalPurchaseCost: number;
  totalSales: number;
  netProfit: number;
  roi: number | null;
  totalRenewalCost: number;
  totalListPrice: number;
  estimatedPortfolioValue: number;
  pricedDomains: number;
  renewedDomains: number;
  soldDomains: number;
  activeDomains: number;
  listedDomains: number;
  expiredDomains: number;
  sellRate: number;
  requiringAction: number;
  dataQualityIssues: number;
  expiring30: DerivedDomain[];
  expiring60: DerivedDomain[];
  expiring90: DerivedDomain[];
  countsByStatus: Record<DomainStatus, number>;
  countsByRisk: Record<ExpiryRisk, number>;
};

const sum = (values: Array<number | null>) =>
  ROUND(values.reduce<number>((total, value) => total + (value ?? 0), 0));

/** Aggregates the whole (non-archived) portfolio. Mirror of the legacy summary. */
export function summarizePortfolio(records: DerivedDomain[]): PortfolioSummary {
  const sold = records.filter(record => record.effectiveStatus === "sold");

  const totalPurchaseCost = sum(records.map(record => record.purchase_price));
  const totalSales = sum(sold.map(record => record.sale_price));
  const netProfit = sum(sold.map(record => record.netProfit));

  const reviewableRenewals = records.filter(
    record =>
      record.effectiveStatus !== "sold" &&
      record.effectiveStatus !== "expired" &&
      record.daysLeft !== null &&
      record.daysLeft >= 0
  );

  const expiring = (days: number) =>
    records
      .filter(
        record =>
          record.effectiveStatus !== "sold" &&
          record.daysLeft !== null &&
          record.daysLeft >= 0 &&
          record.daysLeft <= days
      )
      .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));

  const countsByStatus = records.reduce<Record<DomainStatus, number>>(
    (acc, record) => {
      acc[record.effectiveStatus] += 1;
      return acc;
    },
    { active: 0, listed: 0, hold: 0, sold: 0, expired: 0 }
  );

  const countsByRisk = records.reduce<Record<ExpiryRisk, number>>(
    (acc, record) => {
      acc[record.expiryRisk] += 1;
      return acc;
    },
    { expired: 0, "0-30": 0, "31-60": 0, "61-90": 0, "91-180": 0, "180+": 0, missing: 0 }
  );

  return {
    totalDomains: records.length,
    totalPurchaseCost,
    totalSales,
    netProfit,
    roi: totalPurchaseCost > 0 ? ROUND((netProfit / totalPurchaseCost) * 100) : null,
    totalRenewalCost: sum(reviewableRenewals.map(record => record.renewal_cost)),
    totalListPrice: sum(
      records.filter(record => record.effectiveStatus !== "sold").map(record => record.asking_price)
    ),
    estimatedPortfolioValue: sum(records.map(record => record.estimated_value)),
    pricedDomains: records.filter(
      record => record.effectiveStatus !== "sold" && record.asking_price !== null
    ).length,
    renewedDomains: records.filter(record => record.last_renewed_at !== null).length,
    soldDomains: sold.length,
    activeDomains: countsByStatus.active,
    listedDomains: countsByStatus.listed,
    expiredDomains: countsByStatus.expired,
    sellRate: records.length ? ROUND((sold.length / records.length) * 100) : 0,
    requiringAction: records.filter(
      record =>
        record.recommendedAction === "review" ||
        record.recommendedAction === "dont_renew" ||
        record.qualityIssues.length > 0
    ).length,
    dataQualityIssues: records.reduce((total, record) => total + record.qualityIssues.length, 0),
    expiring30: expiring(30),
    expiring60: expiring(60),
    expiring90: expiring(90),
    countsByStatus,
    countsByRisk,
  };
}

/** Rows that should appear in the active portfolio (archived rows excluded). */
export function isArchived(record: Pick<DomainRow, "archived_at">) {
  return Boolean(record.archived_at);
}

/** A domain is sold once it carries a sale date or the stored "sold" status. */
export function isSold(record: Pick<DerivedDomain, "effectiveStatus">) {
  return record.effectiveStatus === "sold";
}

/** A domain is expired once its expiry date is behind today. */
export function isExpired(record: Pick<DerivedDomain, "effectiveStatus">) {
  return record.effectiveStatus === "expired";
}

/**
 * What the Domains page owns: everything that is neither sold nor expired.
 * Sold and expired rows are filtered out of the table, never deleted, and each
 * one has its own page.
 */
export function isOwned(record: Pick<DerivedDomain, "effectiveStatus">) {
  return !isSold(record) && !isExpired(record);
}

/** The Domains table order: soonest to expire first, undated domains last. */
export function compareByExpiry(a: DerivedDomain, b: DerivedDomain) {
  return (a.daysLeft ?? Number.POSITIVE_INFINITY) - (b.daysLeft ?? Number.POSITIVE_INFINITY);
}

/**
 * The owned portfolio in the order the Domains table shows it. A row's number
 * (1, 2, 3 …) is its position here, and `/domains/<number>` resolves the same
 * way — so a record link always opens the domain it was copied from.
 */
export function ownedPortfolio(records: DomainRow[], now: Date = new Date()): DerivedDomain[] {
  return deriveDomains(records, now).filter(isOwned).sort(compareByExpiry);
}

/** 1-based portfolio position of every owned domain, keyed by id. */
export function ownedPositions(records: DomainRow[], now: Date = new Date()): Map<string, number> {
  const positions = new Map<string, number>();
  ownedPortfolio(records, now).forEach((record, index) => positions.set(record.id, index + 1));
  return positions;
}
