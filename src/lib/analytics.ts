import { parseUtcDate } from "./format";
import type { DerivedDomain, ExpiryRisk } from "./domain-rules";
import type { DomainStatus } from "@/types/database";
import { EXPIRY_RISK_BUCKETS } from "./constants";

/** Chart-ready shapes derived from the portfolio. Pure — safe to memoise. */

export type MonthDatum = { key: string; label: string; timestamp: number; value: number };

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-US", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

/**
 * Renewal spend forecast for the next `months` calendar months, based on expiry
 * date and recorded renewal cost. Rows without a known cost are excluded rather
 * than estimated.
 */
export function renewalForecast(records: DerivedDomain[], locale = "en", months = 12): MonthDatum[] {
  const buckets = new Map<string, MonthDatum>();
  const now = new Date();
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);

  for (const record of records) {
    if (record.renewal_cost === null || record.effectiveStatus === "sold") continue;
    const expiry = parseUtcDate(record.expiry_date);
    if (!expiry) continue;
    const expiryMonth = Date.UTC(expiry.getUTCFullYear(), expiry.getUTCMonth(), 1);
    if (expiryMonth < start) continue;

    const key = monthKey(expiry);
    const bucket = buckets.get(key) ?? {
      key,
      label: monthLabel(expiry, locale),
      timestamp: expiryMonth,
      value: 0,
    };
    bucket.value += record.renewal_cost;
    buckets.set(key, bucket);
  }

  const ordered = [...buckets.values()].sort((a, b) => a.timestamp - b.timestamp).slice(0, months);

  // Pad the axis so the chart always reads as a 12-month timeline.
  if (ordered.length === 0) return [];
  const padded: MonthDatum[] = [];
  for (let i = 0; i < months; i += 1) {
    const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
    const key = monthKey(cursor);
    const existing = ordered.find(item => item.key === key);
    padded.push(
      existing ?? { key, label: monthLabel(cursor, locale), timestamp: cursor.getTime(), value: 0 }
    );
  }
  return padded;
}

/** Realized net profit per month, from sold records only. */
export function profitOverTime(records: DerivedDomain[], locale = "en"): MonthDatum[] {
  const buckets = new Map<string, MonthDatum>();
  for (const record of records) {
    if (record.effectiveStatus !== "sold" || record.netProfit === null) continue;
    const sold = parseUtcDate(record.sold_date);
    if (!sold) continue;
    const key = monthKey(sold);
    const bucket = buckets.get(key) ?? {
      key,
      label: monthLabel(sold, locale),
      timestamp: Date.UTC(sold.getUTCFullYear(), sold.getUTCMonth(), 1),
      value: 0,
    };
    bucket.value += record.netProfit;
    buckets.set(key, bucket);
  }
  return [...buckets.values()].sort((a, b) => a.timestamp - b.timestamp);
}

export function statusDistribution(records: DerivedDomain[]) {
  const order: DomainStatus[] = ["active", "listed", "sold", "expired"];
  return order.map(status => ({
    status,
    value: records.filter(record => record.effectiveStatus === status).length,
  }));
}

export function riskDistribution(records: DerivedDomain[]) {
  return EXPIRY_RISK_BUCKETS.map(risk => ({
    risk: risk as ExpiryRisk,
    value: records.filter(record => record.expiryRisk === risk).length,
  })).filter(entry => entry.value > 0);
}

export type Segment = {
  label: string;
  count: number;
  saleValue: number;
  proceeds: number;
  profit: number;
  roi: number | null;
};

/** Group sold records by an arbitrary dimension (platform, TLD, niche). */
export function segmentSold(
  records: DerivedDomain[],
  pick: (record: DerivedDomain) => string | null | undefined
): Segment[] {
  const grouped = new Map<string, { count: number; saleValue: number; proceeds: number; profit: number; cost: number }>();
  for (const record of records) {
    if (record.effectiveStatus !== "sold") continue;
    const label = pick(record)?.trim() || "—";
    const item = grouped.get(label) ?? { count: 0, saleValue: 0, proceeds: 0, profit: 0, cost: 0 };
    item.count += 1;
    item.saleValue += record.sale_price ?? 0;
    item.proceeds += record.proceeds ?? 0;
    item.profit += record.netProfit ?? 0;
    item.cost += record.purchase_price ?? 0;
    grouped.set(label, item);
  }
  return [...grouped.entries()]
    .map(([label, item]) => ({
      label,
      count: item.count,
      saleValue: item.saleValue,
      proceeds: item.proceeds,
      profit: item.profit,
      roi: item.cost > 0 ? Number(((item.profit / item.cost) * 100).toFixed(2)) : null,
    }))
    .sort((a, b) => b.profit - a.profit || b.count - a.count);
}

/** Holding-period buckets for sold records. */
export function holdingPeriodDistribution(records: DerivedDomain[]) {
  const buckets = [
    { label: "<30d", min: 0, max: 30 },
    { label: "30–90d", min: 31, max: 90 },
    { label: "90–180d", min: 91, max: 180 },
    { label: "180–365d", min: 181, max: 365 },
    { label: "365d+", min: 366, max: Number.POSITIVE_INFINITY },
  ];
  return buckets.map(bucket => ({
    label: bucket.label,
    value: records.filter(
      record =>
        record.effectiveStatus === "sold" &&
        record.holdingDays !== null &&
        record.holdingDays >= bucket.min &&
        record.holdingDays <= bucket.max
    ).length,
  }));
}
