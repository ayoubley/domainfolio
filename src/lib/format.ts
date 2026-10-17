/**
 * Formatting helpers. All money renders as tabular figures and honours the
 * workspace's preferred currency symbol while keeping amounts unconverted —
 * DomainFolio never invents exchange rates (a deliberate product rule).
 */

const CURRENCY_SYMBOL: Record<string, string> = {
  USD: "$",
  EUR: "€",
};

export function currencySymbol(currency: string | null | undefined) {
  return CURRENCY_SYMBOL[currency ?? "USD"] ?? "$";
}

export function money(
  value: number | null | undefined,
  options?: { currency?: string | null; compact?: boolean; showSymbol?: boolean }
) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const symbol = options?.showSymbol === false ? "" : currencySymbol(options?.currency);
  const formatted = new Intl.NumberFormat("en-US", {
    notation: options?.compact ? "compact" : "standard",
    maximumFractionDigits: options?.compact ? 1 : 2,
    minimumFractionDigits: options?.compact ? 0 : 2,
  }).format(value);
  return `${symbol}${formatted}`;
}

export function int(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "0";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export function percent(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

/** Signed money, used for profit columns. */
export function signedMoney(value: number | null | undefined, currency?: string | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${money(Math.abs(value), { currency })}`;
}

/**
 * A UTC calendar date is the unit of truth for purchase/expiry/sold dates.
 * These helpers never fall back to local time, so a user in any timezone
 * sees the same "days left" figure.
 */
export function parseUtcDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    const [, y, m, d] = match;
    return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function toIsoDate(value: string | Date | null | undefined): string {
  const parsed = parseUtcDate(value);
  return parsed ? parsed.toISOString().slice(0, 10) : "";
}

export function formatDate(
  value: string | Date | null | undefined,
  locale = "en",
  style: "short" | "medium" = "short"
) {
  const parsed = parseUtcDate(value);
  if (!parsed) return "—";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-US", {
    year: "numeric",
    month: style === "short" ? "short" : "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

export function relativeDays(days: number | null | undefined, locale = "en") {
  if (days === null || days === undefined) return "—";
  if (days === 0) return locale === "ar" ? "اليوم" : "Today";
  if (days < 0) {
    const n = Math.abs(days);
    return locale === "ar" ? `متأخر ${n} يوم` : `${n}d overdue`;
  }
  return locale === "ar" ? `${days} يوم` : `${days}d`;
}
