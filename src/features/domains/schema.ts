import { z } from "zod";
import { hasInvalidDateOrder, normalizeDomain } from "@/lib/domain-rules";
import type { DomainRow } from "@/types/database";

const DOMAIN_PATTERN = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

export type DomainFormMode = "create" | "update";

/**
 * Form schema. `create` requires the two fields the original required
 * (purchase date and price); `update` only validates what is present.
 * Messages are i18n keys, translated where the error is rendered.
 */
export function createDomainFormSchema(mode: DomainFormMode) {
  return z
    .object({
      domain: z
        .string()
        .trim()
        .min(1, "validation.domainRequired")
        .refine(value => DOMAIN_PATTERN.test(normalizeDomain(value)), "validation.domainInvalid"),
      purchaseDate: z.string().nullable(),
      expiryDate: z.string().nullable(),
      purchasePrice: z.number().nullable(),
      purchaseCurrency: z.enum(["USD", "EUR"]),
      renewalCost: z.number().nullable(),
      registrar: z.string().trim().max(120, "validation.tooLong"),
      status: z.enum(["active", "listed", "sold", "expired"]),
      renewalDecision: z.enum(["auto_renew", "renew", "review", "dont_renew", "pending"]),
      listedOn: z.array(z.string()),
      askingPrice: z.number().nullable(),
      salePlatform: z.string().trim().max(120, "validation.tooLong"),
      saleType: z.union([z.enum(["buy_now", "make_offer", "request_price"]), z.literal("")]),
      soldDate: z.string().nullable(),
      salePrice: z.number().nullable(),
      netProceeds: z.number().nullable(),
      acquisitionSource: z.string().trim().max(120, "validation.tooLong"),
      niche: z.string().trim().max(120, "validation.tooLong"),
      estimatedValue: z.number().nullable(),
      tags: z.array(z.string()),
      notes: z.string().max(4000, "validation.tooLong"),
    })
    .superRefine((value, ctx) => {
      if (hasInvalidDateOrder(value.purchaseDate, value.expiryDate)) {
        ctx.addIssue({ code: "custom", path: ["expiryDate"], message: "validation.dateOrder" });
      }
      if (mode === "create") {
        if (!value.purchaseDate) {
          ctx.addIssue({ code: "custom", path: ["purchaseDate"], message: "validation.required" });
        }
        if (value.purchasePrice === null) {
          ctx.addIssue({ code: "custom", path: ["purchasePrice"], message: "validation.required" });
        }
      }
      if (value.status === "sold" && !value.soldDate && !value.salePrice) {
        ctx.addIssue({ code: "custom", path: ["soldDate"], message: "validation.required" });
      }
    });
}

export type DomainFormValues = z.infer<ReturnType<typeof createDomainFormSchema>>;

export const EMPTY_DOMAIN_FORM: DomainFormValues = {
  domain: "",
  purchaseDate: null,
  expiryDate: null,
  purchasePrice: null,
  purchaseCurrency: "USD",
  renewalCost: null,
  registrar: "",
  status: "active",
  renewalDecision: "auto_renew",
  listedOn: [],
  askingPrice: null,
  salePlatform: "",
  saleType: "",
  soldDate: null,
  salePrice: null,
  netProceeds: null,
  acquisitionSource: "",
  niche: "",
  estimatedValue: null,
  tags: [],
  notes: "",
};

/** Maps a stored row into form values (edit mode). */
export function domainToFormValues(row: DomainRow): DomainFormValues {
  return {
    domain: row.domain,
    purchaseDate: row.purchase_date,
    expiryDate: row.expiry_date,
    purchasePrice: row.purchase_price,
    purchaseCurrency: row.purchase_currency,
    renewalCost: row.renewal_cost,
    registrar: row.registrar ?? "",
    status: row.status,
    renewalDecision: row.renewal_decision,
    listedOn: row.listed_on ?? [],
    askingPrice: row.asking_price,
    salePlatform: row.sale_platform ?? "",
    saleType: row.sale_type ?? "",
    soldDate: row.sold_date,
    salePrice: row.sale_price,
    netProceeds: row.net_proceeds,
    acquisitionSource: row.acquisition_source ?? "",
    niche: row.niche ?? "",
    estimatedValue: row.estimated_value,
    tags: row.tags ?? [],
    notes: row.notes ?? "",
  };
}

/** Converts form values into the database payload, trimming empties to null. */
export function formValuesToPayload(values: DomainFormValues) {
  const blankToNull = (input: string) => (input.trim() === "" ? null : input.trim());
  return {
    domain: normalizeDomain(values.domain),
    purchase_date: values.purchaseDate,
    expiry_date: values.expiryDate,
    purchase_price: values.purchasePrice,
    purchase_currency: values.purchaseCurrency,
    renewal_cost: values.renewalCost,
    registrar: blankToNull(values.registrar),
    status: values.status,
    renewal_decision: values.renewalDecision,
    listed_on: values.listedOn.length ? values.listedOn : null,
    asking_price: values.askingPrice,
    sale_platform: blankToNull(values.salePlatform),
    sale_type: values.saleType === "" ? null : values.saleType,
    sold_date: values.soldDate,
    sale_price: values.salePrice,
    net_proceeds: values.netProceeds,
    acquisition_source: blankToNull(values.acquisitionSource),
    niche: blankToNull(values.niche),
    estimated_value: values.estimatedValue,
    tags: values.tags.length ? values.tags : null,
    notes: blankToNull(values.notes),
  };
}
