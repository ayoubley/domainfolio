import type { DerivedDomain } from "@/lib/domain-rules";

/** Column order that round-trips with the import template. */
export const EXPORT_COLUMNS = [
  "domain",
  "purchase_date",
  "registered_date",
  "expiry_date",
  "purchase_price",
  "purchase_currency",
  "renewal_cost",
  "min_offer",
  "registrar",
  "status",
  "renewal_decision",
  "auto_renew",
  "privacy",
  "locked",
  "nameservers",
  "url_forwarding",
  "registry_status",
  "source",
  "listed_on",
  "asking_price",
  "sale_platform",
  "sale_type",
  "sold_date",
  "sale_price",
  "net_proceeds",
  "acquisition_source",
  "niche",
  "estimated_value",
  "tags",
  "notes",
] as const;

type ExportableDomain = Pick<
  DerivedDomain,
  | "domain"
  | "purchase_date"
  | "registered_date"
  | "expiry_date"
  | "purchase_price"
  | "purchase_currency"
  | "renewal_cost"
  | "min_offer"
  | "registrar"
  | "status"
  | "renewal_decision"
  | "auto_renew"
  | "privacy"
  | "locked"
  | "nameservers"
  | "url_forwarding"
  | "registry_status"
  | "source"
  | "listed_on"
  | "asking_price"
  | "sale_platform"
  | "sale_type"
  | "sold_date"
  | "sale_price"
  | "net_proceeds"
  | "acquisition_source"
  | "niche"
  | "estimated_value"
  | "tags"
  | "notes"
>;

function toRow(record: ExportableDomain): Record<string, string | number> {
  return {
    domain: record.domain,
    purchase_date: record.purchase_date ?? "",
    registered_date: record.registered_date ?? "",
    expiry_date: record.expiry_date ?? "",
    purchase_price: record.purchase_price ?? "",
    purchase_currency: record.purchase_currency,
    renewal_cost: record.renewal_cost ?? "",
    min_offer: record.min_offer ?? "",
    registrar: record.registrar ?? "",
    status: record.status,
    renewal_decision: record.renewal_decision,
    auto_renew: record.auto_renew ? "yes" : "no",
    privacy: record.privacy ? "yes" : "no",
    locked: record.locked ? "yes" : "no",
    nameservers: (record.nameservers ?? []).join(" | "),
    url_forwarding: record.url_forwarding ?? "",
    registry_status: record.registry_status ?? "",
    source: record.source,
    listed_on: (record.listed_on ?? []).join(" | "),
    asking_price: record.asking_price ?? "",
    sale_platform: record.sale_platform ?? "",
    sale_type: record.sale_type ?? "",
    sold_date: record.sold_date ?? "",
    sale_price: record.sale_price ?? "",
    net_proceeds: record.net_proceeds ?? "",
    acquisition_source: record.acquisition_source ?? "",
    niche: record.niche ?? "",
    estimated_value: record.estimated_value ?? "",
    tags: (record.tags ?? []).join(" | "),
    notes: record.notes ?? "",
  };
}

/**
 * Exports exactly the rows passed in (the current, filtered view). Uses the
 * stable `domainfolio-YYYY-MM-DD` filename and never rewrites amounts.
 *
 * xlsx is imported on demand so the spreadsheet library never lands in the
 * initial bundle.
 */
export async function exportDomains(records: ExportableDomain[], format: "csv" | "xlsx") {
  const XLSX = await import("xlsx");
  const data = records.map(toRow);
  const worksheet = XLSX.utils.json_to_sheet(data, { header: [...EXPORT_COLUMNS] });
  const stamp = new Date().toISOString().slice(0, 10);
  const fileName = `domainfolio-${stamp}`;

  if (format === "csv") {
    XLSX.writeFile({ SheetNames: ["Domains"], Sheets: { Domains: worksheet } }, `${fileName}.csv`, {
      bookType: "csv",
    });
  } else {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Domains");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  }
}
