import { supabase } from "@/lib/supabase";
import { moneyNumber, normalizeDomain } from "@/lib/domain-rules";
import type {
  DomainActivityRow,
  DomainInsert,
  DomainRow,
  DomainUpdate,
  Json,
} from "@/types/database";
import { ACTIVITY_ACTIONS } from "@/lib/constants";

/**
 * The write path. Mirrors the previous `portfolioDb` behaviour:
 *  - every create/update writes a matching `domain_activity` row
 *  - the change-diff only inspects fields actually present in the payload
 *  - numbers are compared as numbers, so `"199.00"` never logs a phantom change
 *  - archive/restore/renew/import go through Postgres RPCs for atomicity
 */

const FIELD_LABELS: Partial<Record<keyof DomainRow, string>> = {
  domain: "domain",
  purchase_date: "purchase_date",
  expiry_date: "expiry_date",
  purchase_price: "purchase_price",
  purchase_currency: "purchase_currency",
  renewal_cost: "renewal_cost",
  registrar: "registrar",
  status: "status",
  renewal_decision: "renewal_decision",
  listed_on: "listed_on",
  asking_price: "asking_price",
  sale_platform: "sale_platform",
  sale_type: "sale_type",
  sold_date: "sold_date",
  sale_price: "sale_price",
  net_proceeds: "net_proceeds",
  acquisition_source: "acquisition_source",
  niche: "niche",
  estimated_value: "estimated_value",
  tags: "tags",
  notes: "notes",
};

const NUMERIC_FIELDS = new Set<keyof DomainRow>([
  "purchase_price",
  "renewal_cost",
  "asking_price",
  "sale_price",
  "net_proceeds",
  "estimated_value",
]);

const ARRAY_FIELDS = new Set<keyof DomainRow>(["listed_on", "tags"]);

function comparable(field: keyof DomainRow, value: unknown): unknown {
  if (value === null || value === undefined || value === "") return null;
  if (NUMERIC_FIELDS.has(field)) return moneyNumber(value);
  if (ARRAY_FIELDS.has(field)) {
    const list = Array.isArray(value) ? value : [];
    return [...list].map(item => String(item).trim()).sort().join("\u0000");
  }
  if (typeof value === "string") return value.trim();
  return value;
}

type ChangeMap = Record<string, { from: Json; to: Json }>;

export function diffDomain(
  previous: Pick<DomainRow, keyof DomainRow> | null,
  patch: Record<string, unknown>
): ChangeMap {
  const changes: ChangeMap = {};
  for (const [key, next] of Object.entries(patch)) {
    if (!(key in FIELD_LABELS)) continue;
    const field = key as keyof DomainRow;
    const before = previous ? previous[field] : null;
    if (comparable(field, before) !== comparable(field, next)) {
      changes[key] = { from: (before ?? null) as Json, to: (next ?? null) as Json };
    }
  }
  return changes;
}

export function summarizeChanges(changes: ChangeMap) {
  const keys = Object.keys(changes);
  if (keys.length === 0) return "No field changes";
  if (keys.length <= 3) return `Updated ${keys.join(", ")}`;
  return `Updated ${keys.length} fields`;
}

/** Strips the payload down to real columns and normalises the domain name. */
function toDomainPayload(patch: Record<string, unknown>): DomainUpdate {
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (!(key in FIELD_LABELS) && key !== "archived_at" && key !== "archive_reason") continue;
    payload[key] = value === undefined ? null : value;
  }
  if (typeof payload.domain === "string") {
    payload.domain = normalizeDomain(payload.domain);
  }
  return payload as DomainUpdate;
}

export async function fetchDomains(workspaceId: string, includeArchived = false): Promise<DomainRow[]> {
  let request = supabase
    .from("domains")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (!includeArchived) request = request.is("archived_at", null);
  const { data, error } = await request;
  if (error) throw error;
  return data ?? [];
}

export async function fetchDomain(id: string): Promise<DomainRow | null> {
  const { data, error } = await supabase.from("domains").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

/** Duplicate detection includes archived rows — a domain is owned once. */
export async function domainExists(workspaceId: string, domain: string, excludeId?: string): Promise<boolean> {
  let request = supabase
    .from("domains")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("domain", normalizeDomain(domain));
  if (excludeId) request = request.neq("id", excludeId);
  const { data, error } = await request.limit(1);
  if (error) throw error;
  return (data ?? []).length > 0;
}

async function logActivity(input: {
  workspaceId: string;
  userId: string;
  domainId: string;
  action: (typeof ACTIVITY_ACTIONS)[number];
  summary: string;
  changes?: Json | null;
}) {
  await supabase.from("domain_activity").insert({
    workspace_id: input.workspaceId,
    user_id: input.userId,
    domain_id: input.domainId,
    action: input.action,
    summary: input.summary,
    changes: input.changes ?? null,
  });
}

export async function createDomain(input: {
  workspaceId: string;
  userId: string;
  values: Record<string, unknown>;
}): Promise<DomainRow> {
  const payload = toDomainPayload(input.values) as DomainInsert;
  const { data, error } = await supabase
    .from("domains")
    .insert({
      ...payload,
      workspace_id: input.workspaceId,
      user_id: input.userId,
      domain: payload.domain as string,
    })
    .select("*")
    .single();
  if (error) throw error;

  await logActivity({
    workspaceId: input.workspaceId,
    userId: input.userId,
    domainId: data.id,
    action: "created",
    summary: `Added ${data.domain}`,
    changes: { domain: { from: null, to: data.domain } },
  });
  return data;
}

export async function updateDomain(input: {
  workspaceId: string;
  userId: string;
  previous: DomainRow;
  values: Record<string, unknown>;
}): Promise<DomainRow> {
  const payload = toDomainPayload(input.values);
  const changes = diffDomain(input.previous, payload as Record<string, unknown>);

  const { data, error } = await supabase
    .from("domains")
    .update(payload)
    .eq("id", input.previous.id)
    .select("*")
    .single();
  if (error) throw error;

  if (Object.keys(changes).length > 0) {
    const soldNow = !input.previous.sold_date && Boolean(data.sold_date);
    await logActivity({
      workspaceId: input.workspaceId,
      userId: input.userId,
      domainId: data.id,
      action: soldNow ? "sold" : "updated",
      summary: soldNow ? `Sold ${data.domain}` : summarizeChanges(changes),
      changes,
    });
  }
  return data;
}

export async function renewDomain(input: {
  domainId: string;
  renewalCost: number | null;
  note?: string | null;
}): Promise<DomainRow> {
  const { data, error } = await supabase.rpc("renew_domain", {
    p_domain_id: input.domainId,
    p_renewal_cost: input.renewalCost,
    p_note: input.note ?? null,
  });
  if (error) throw error;
  return data;
}

export async function archiveDomain(input: { domainId: string; reason?: string | null }): Promise<DomainRow> {
  const { data, error } = await supabase.rpc("archive_domain", {
    p_domain_id: input.domainId,
    p_reason: input.reason ?? null,
  });
  if (error) throw error;
  return data;
}

export async function restoreDomain(input: { domainId: string }): Promise<DomainRow> {
  const { data, error } = await supabase.rpc("restore_domain", { p_domain_id: input.domainId });
  if (error) throw error;
  return data;
}

export async function loadDemoData(workspaceId: string): Promise<number> {
  const { data, error } = await supabase.rpc("load_demo_data", { p_workspace_id: workspaceId });
  if (error) throw error;
  return data ?? 0;
}

export async function archiveDomains(input: { domainIds: string[]; reason?: string | null }) {
  for (const domainId of input.domainIds) {
    await archiveDomain({ domainId, reason: input.reason ?? null });
  }
}

export async function restoreDomains(domainIds: string[]) {
  for (const domainId of domainIds) {
    await restoreDomain({ domainId });
  }
}

export async function fetchActivity(workspaceId: string, limit = 40): Promise<DomainActivityRow[]> {
  const { data, error } = await supabase
    .from("domain_activity")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function fetchDomainActivity(domainId: string): Promise<DomainActivityRow[]> {
  const { data, error } = await supabase
    .from("domain_activity")
    .select("*")
    .eq("domain_id", domainId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data ?? [];
}
