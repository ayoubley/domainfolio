/**
 * Import pipeline — pure, testable, and free of React.
 *
 * Everything a pasted list or a spreadsheet produces goes through
 * `resolveImportRows`, which coerces each cell with a Zod schema. Nothing is
 * ever invented: an unreadable price or date becomes a row error, not a zero.
 */

import { z } from "zod";
import { expiryAfterOneYear, isValidDomainName, normalizeDomain } from "@/lib/domain-rules";
import { toIsoDate } from "@/lib/format";
import { DOMAIN_SOURCES, DOMAIN_STATUSES, RENEWAL_DECISIONS } from "@/lib/constants";
import type { PurchaseCurrency } from "@/types/database";

/* --------------------------------- fields --------------------------------- */

export const IMPORT_FIELDS = [
  "domain",
  "purchase_date",
  "expiry_date",
  "registered_date",
  "purchase_price",
  "purchase_currency",
  "renewal_cost",
  "registrar",
  "status",
  "renewal_decision",
  "asking_price",
  "min_offer",
  "auto_renew",
  "privacy",
  "locked",
  "nameservers",
  "url_forwarding",
  "acquisition_source",
  "niche",
  "estimated_value",
  "tags",
  "notes",
] as const;

export type ImportField = (typeof IMPORT_FIELDS)[number];

/** Maps a target field to the spreadsheet column that feeds it. */
export type ColumnMapping = Partial<Record<ImportField, string>>;

/** Fields the mapping UI exposes (the rest stay auto-mapped). */
export const MAPPABLE_FIELDS: ImportField[] = [
  "domain",
  "purchase_date",
  "expiry_date",
  "registered_date",
  "purchase_price",
  "purchase_currency",
  "renewal_cost",
  "registrar",
  "status",
  "asking_price",
  "min_offer",
  "auto_renew",
  "url_forwarding",
  "acquisition_source",
  "niche",
  "notes",
];

export type ImportDefaults = {
  purchaseDate: string | null;
  purchasePrice: number | null;
  registrar: string;
  currency: PurchaseCurrency;
  autoRenew: boolean;
};

export type ImportRow = {
  /** 1-based line number as the user sees it (header counts as line 1). */
  line: number;
  domain: string;
  values: ImportValues | null;
  errors: string[];
  duplicate: boolean;
};

export type ImportValues = z.infer<typeof importRowSchema>;

export type ImportPreview = {
  rows: ImportRow[];
  valid: ImportRow[];
  invalid: ImportRow[];
  duplicates: ImportRow[];
};

/* ------------------------------- parsing ---------------------------------- */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Splits a pasted blob into domain names (newlines, commas, spaces, tabs). */
export function parseDomainList(text: string): string[] {
  return text
    .split(/[\s,;]+/)
    .map(token => token.trim())
    .filter(Boolean);
}

function parseMoney(value: string): { ok: true; value: number | null } | { ok: false } {
  if (value.trim() === "") return { ok: true, value: null };
  const cleaned = value.replace(/[^0-9.]/g, "");
  // A cell with no digits at all is a mistake (e.g. "N/A" in a price column),
  // never a silent zero — the product rule forbids inventing amounts.
  if (!/[0-9]/.test(cleaned)) return { ok: false };
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed) || parsed < 0) return { ok: false };
  return { ok: true, value: Math.round(parsed * 100) / 100 };
}

function parseIsoDate(value: string): { ok: true; value: string | null } | { ok: false } {
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, value: null };
  if (ISO_DATE.test(trimmed)) return { ok: true, value: trimmed };

  // A bare number is not a date: "80" has to be a row error, never 1980-01-01.
  if (/^\d{1,4}$/.test(trimmed)) return { ok: false };

  // Tolerate d/m/y and m/d/y, and named months, via the platform parser.
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return { ok: false };
  return { ok: true, value: toIsoDate(parsed) };
}

const TRUE_TOKENS = new Set(["true", "yes", "y", "1", "on", "نعم", "صحيح"]);
const FALSE_TOKENS = new Set(["false", "no", "n", "0", "off", "لا", "خطأ"]);

function parseBoolean(value: string): boolean | null {
  const token = value.trim().toLowerCase();
  if (!token) return null;
  if (TRUE_TOKENS.has(token)) return true;
  if (FALSE_TOKENS.has(token)) return false;
  return null;
}

function parseList(value: string): string[] {
  return value
    .split(/\s*[|,;\n]\s*/)
    .map(item => item.trim())
    .filter(Boolean);
}

/* ------------------------------- the schema -------------------------------- */

const importRowSchema = z.object({
  domain: z.string().refine(isValidDomainName, "domain"),
  folder_id: z.string().nullable(),
  registered_date: z.string().regex(ISO_DATE).nullable(),
  source: z.enum(DOMAIN_SOURCES),
  purchase_date: z.string().regex(ISO_DATE).nullable(),
  expiry_date: z.string().regex(ISO_DATE).nullable(),
  purchase_price: z.number().min(0).nullable(),
  purchase_currency: z.enum(["USD", "EUR"]),
  renewal_cost: z.number().min(0).nullable(),
  registrar: z.string().max(120).nullable(),
  status: z.enum(DOMAIN_STATUSES),
  renewal_decision: z.enum(RENEWAL_DECISIONS),
  asking_price: z.number().min(0).nullable(),
  min_offer: z.number().min(0).nullable(),
  auto_renew: z.boolean(),
  privacy: z.boolean(),
  locked: z.boolean(),
  nameservers: z.array(z.string().max(255)),
  url_forwarding: z.string().max(500).nullable(),
  acquisition_source: z.string().max(120).nullable(),
  niche: z.string().max(120).nullable(),
  estimated_value: z.number().min(0).nullable(),
  tags: z.array(z.string().max(60)),
  notes: z.string().max(4000).nullable(),
});

/* ------------------------------ column mapping ----------------------------- */

/** Header → field aliases, compared after stripping non-alphanumerics. */
const FIELD_ALIASES: Record<ImportField, string[]> = {
  domain: ["domain", "domainname", "name", "names", "url", "website"],
  purchase_date: ["purchasedate", "purchase", "bought", "boughtdate", "acquired", "acquireddate", "date"],
  expiry_date: ["expirydate", "expiry", "expires", "expiration", "expirationdate", "renewaldate", "duedate"],
  registered_date: ["registereddate", "registered", "registration", "created", "createddate", "registrationdate"],
  purchase_price: ["purchaseprice", "cost", "price", "buyprice", "paid", "costbasis"],
  purchase_currency: ["purchasecurrency", "currency", "ccy"],
  renewal_cost: ["renewalcost", "renewal", "renewalprice", "renewalfee", "renewfee"],
  registrar: ["registrar", "registry", "provider", "registrarcompany"],
  status: ["status", "state"],
  renewal_decision: ["renewaldecision", "decision", "renewalplan"],
  asking_price: ["askingprice", "binprice", "bin", "listprice", "list", "saleprice", "forsale"],
  min_offer: ["minoffer", "minimumoffer", "minimum", "floor", "floorprice"],
  auto_renew: ["autorenew", "autorenewal", "renewautomatically"],
  privacy: ["privacy", "privacyprotection", "whoisguard", "idprotect"],
  locked: ["locked", "lock", "transferlock", "clienttransferprohibited"],
  nameservers: ["nameservers", "nameserver", "ns", "dns"],
  url_forwarding: ["urlforwarding", "forwarding", "redirect", "forwardto", "redirectto"],
  acquisition_source: ["acquisitionsource", "source", "acquiredfrom", "channel", "origin"],
  niche: ["niche", "category", "vertical", "industry"],
  estimated_value: ["estimatedvalue", "estimate", "valuation", "appraisal", "appraisedvalue"],
  tags: ["tags", "tag", "labels", "keywords"],
  notes: ["notes", "note", "comment", "comments", "description", "remarks"],
};

const normalizeHeader = (header: string) => header.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/g, "");

/**
 * Best-effort header mapping: exact name, then alias, then substring. Exact and
 * alias matches are claimed first, across every field, so a loose substring
 * match can never steal a column that another field names exactly (the old
 * one-pass version mapped "Purchase Price" to purchase *date* before the price
 * field could claim it). The user can always correct it in the mapping table.
 */
export function autoMapColumns(headers: string[]): ColumnMapping {
  const normalized = headers.map(header => ({ header, key: normalizeHeader(header) }));
  const mapping: ColumnMapping = {};
  const claimed = new Set<string>();

  for (const pass of ["strong", "loose"] as const) {
    for (const field of IMPORT_FIELDS) {
      if (mapping[field]) continue;
      const aliases = FIELD_ALIASES[field];
      // A column already spoken for is off the table for every later field.
      const available = normalized.filter(item => !claimed.has(item.header));
      const match =
        pass === "strong"
          ? (available.find(item => item.key === normalizeHeader(field)) ??
            available.find(item => aliases.includes(item.key)))
          : available.find(item => item.key !== "" && aliases.some(alias => item.key.includes(alias)));
      if (match) {
        mapping[field] = match.header;
        claimed.add(match.header);
      }
    }
  }

  return mapping;
}

/* --------------------------------- sheets ---------------------------------- */

export type ParsedSheet = {
  headers: string[];
  /** Every data row as a header → raw cell (already stringified). */
  rows: Record<string, string>[];
};

function cellToString(cell: unknown): string {
  if (cell === null || cell === undefined) return "";
  if (cell instanceof Date) return toIsoDate(cell);
  return String(cell).trim();
}

/** Reads a .csv/.xlsx/.xls file into headers + stringified rows. */
export async function readSheetFile(file: File): Promise<ParsedSheet> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { headers: [], rows: [] };
  const sheet = workbook.Sheets[sheetName];

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: false,
  });

  const [headerRow, ...dataRows] = matrix;
  if (!headerRow) return { headers: [], rows: [] };

  const headers = headerRow.map((cell, index) => {
    const text = cellToString(cell);
    return text || `Column ${index + 1}`;
  });

  const rows = dataRows
    .filter(row => row.some(cell => cellToString(cell) !== ""))
    .map(row => {
      const record: Record<string, string> = {};
      headers.forEach((header, index) => {
        record[header] = cellToString(row[index]);
      });
      return record;
    });

  return { headers, rows };
}

/* -------------------------------- resolving -------------------------------- */

function applyDefaults(
  raw: Partial<Record<ImportField, string>>,
  defaults: ImportDefaults
): { candidate: Record<string, unknown>; errors: string[] } {
  const errors: string[] = [];
  const pick = (field: ImportField) => (raw[field] ?? "").trim();

  const domain = normalizeDomain(pick("domain"));

  // Money
  const money = (field: ImportField, fallback: number | null): number | null => {
    const text = pick(field);
    if (!text) return fallback;
    const parsed = parseMoney(text);
    if (!parsed.ok) {
      errors.push(`validation.number:${field}`);
      return null;
    }
    return parsed.value;
  };

  // Currency
  const currencyText = pick("purchase_currency").toUpperCase();
  const currency: PurchaseCurrency =
    currencyText === "EUR" || currencyText === "€" ? "EUR" : currencyText === "USD" || currencyText === "$" ? "USD" : defaults.currency;

  // Dates
  const date = (field: ImportField, fallback: string | null): string | null => {
    const text = pick(field);
    if (!text) return fallback;
    const parsed = parseIsoDate(text);
    if (!parsed.ok) {
      errors.push(`validation.dateInvalid:${field}`);
      return null;
    }
    return parsed.value;
  };

  const purchaseDate = date("purchase_date", defaults.purchaseDate);
  const expiryDate = date("expiry_date", purchaseDate ? expiryAfterOneYear(purchaseDate) : null);

  // Enums
  const statusText = pick("status").toLowerCase();
  const status = (DOMAIN_STATUSES as readonly string[]).includes(statusText)
    ? (statusText as (typeof DOMAIN_STATUSES)[number])
    : "active";

  const decisionText = pick("renewal_decision").toLowerCase();
  const renewalDecision = (RENEWAL_DECISIONS as readonly string[]).includes(decisionText)
    ? (decisionText as (typeof RENEWAL_DECISIONS)[number])
    : defaults.autoRenew
      ? "auto_renew"
      : "pending";

  // Booleans
  const bool = (field: ImportField, fallback: boolean): boolean => {
    const parsed = parseBoolean(pick(field));
    return parsed === null ? fallback : parsed;
  };

  const registrar = pick("registrar") || defaults.registrar.trim();

  const candidate: Record<string, unknown> = {
    domain,
    folder_id: null,
    registered_date: date("registered_date", purchaseDate),
    purchase_date: purchaseDate,
    expiry_date: expiryDate,
    purchase_price: money("purchase_price", defaults.purchasePrice),
    purchase_currency: currency,
    renewal_cost: money("renewal_cost", null),
    registrar: registrar || null,
    status,
    renewal_decision: renewalDecision,
    asking_price: money("asking_price", null),
    min_offer: money("min_offer", null),
    auto_renew: bool("auto_renew", defaults.autoRenew),
    privacy: bool("privacy", false),
    locked: bool("locked", false),
    nameservers: parseList(pick("nameservers")),
    url_forwarding: pick("url_forwarding") || null,
    acquisition_source: pick("acquisition_source") || null,
    niche: pick("niche") || null,
    estimated_value: money("estimated_value", null),
    tags: parseList(pick("tags")),
    notes: pick("notes") || null,
    listed_on: null,
    sale_platform: null,
    sale_type: null,
    sold_date: null,
    sale_price: null,
    net_proceeds: null,
    source: "imported" as const,
  };

  return { candidate, errors };
}

/**
 * Turns raw cells into validated rows against the shared import defaults.
 * `existingDomains` should hold normalised domains already in the workspace so
 * duplicates are reported instead of blowing up the insert.
 */
export function resolveImportRows(input: {
  raws: { line: number; cells: Partial<Record<ImportField, string>> }[];
  defaults: ImportDefaults;
  existingDomains: Set<string>;
}): ImportPreview {
  const seen = new Set<string>();
  const rows: ImportRow[] = input.raws.map(raw => {
    const { candidate, errors } = applyDefaults(raw.cells, input.defaults);
    const domain = String(candidate.domain ?? "");

    const parsed = importRowSchema.safeParse(candidate);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const path = String(issue.path[0] ?? "");
        if (!errors.some(existing => existing.endsWith(`:${path}`))) {
          errors.push(`${issue.message === "domain" ? "validation.domainInvalid" : "validation.invalid"}:${path}`);
        }
      }
    }

    const duplicate = Boolean(domain) && (input.existingDomains.has(domain) || seen.has(domain));
    if (domain) seen.add(domain);

    return {
      line: raw.line,
      domain,
      values: parsed.success && !duplicate && errors.length === 0 ? parsed.data : null,
      errors,
      duplicate,
    };
  });

  return {
    rows,
    valid: rows.filter(row => row.values !== null),
    invalid: rows.filter(row => row.values === null && !row.duplicate),
    duplicates: rows.filter(row => row.duplicate),
  };
}

/** A ready-to-fill CSV template so users can see the expected headers. */
export function importTemplateCsv(): string {
  const headers = [
    "domain",
    "purchase_date",
    "expiry_date",
    "purchase_price",
    "purchase_currency",
    "renewal_cost",
    "registrar",
    "status",
    "asking_price",
    "min_offer",
    "auto_renew",
    "nameservers",
    "url_forwarding",
    "acquisition_source",
    "niche",
    "tags",
    "notes",
  ];
  return `${headers.join(",")}\nexample.com,2025-01-15,2026-01-15,950,USD,14,Namecheap,active,4500,3200,true,ns1.example.com,https://landing.example.com,Dropcatch,Brandable,premium|short,Looks strong\n`;
}
