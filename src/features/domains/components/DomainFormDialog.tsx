import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { ChevronDown, Info } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { DatePicker } from "@/components/shared/DatePicker";
import { Field } from "@/components/shared/Field";
import { TagInput } from "@/components/shared/TagInput";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  NICHES,
  PURCHASE_CURRENCIES,
  DOMAIN_STATUSES,
  REGISTRY_STATUSES,
  RENEWAL_DECISIONS,
  SALE_TYPES,
} from "@/lib/constants";
import { expiryAfterOneYear, getTld } from "@/lib/domain-rules";
import { domainExists } from "@/features/domains/api";
import { useCreateDomain, useFoldersQuery, useUpdateDomain } from "@/features/domains/queries";
import {
  EMPTY_DOMAIN_FORM,
  createDomainFormSchema,
  domainToFormValues,
  formValuesToPayload,
  type DomainFormValues,
} from "@/features/domains/schema";
import { useWorkspace } from "@/hooks/useWorkspace";
import { toIsoDate } from "@/lib/format";
import type { DomainRow, PurchaseCurrency } from "@/types/database";
import { cn } from "@/lib/utils";

const REGISTRY_NONE = "__none__";
const REGISTRY_FLAGS = [
  { key: "autoRenew", id: "flag-auto-renew" },
  { key: "privacy", id: "flag-privacy" },
  { key: "locked", id: "flag-locked" },
] as const;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain?: DomainRow | null;
  /** Values layered on top of the form when it opens (e.g. "Mark as sold"). */
  initialPatch?: Partial<DomainFormValues>;
  onSaved?: (row: DomainRow, mode: "create" | "update") => void;
};

function SectionHeading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="space-y-0.5">
      <h3 className="text-2sm font-semibold text-foreground">{title}</h3>
      {hint ? <p className="text-2xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function boolishAdvanced(domain?: DomainRow | null, patch?: Partial<DomainFormValues>) {
  return Boolean(
    (domain && (domain.acquisition_source || domain.niche || domain.estimated_value || domain.tags?.length)) ||
      patch?.acquisitionSource ||
      patch?.niche ||
      patch?.estimatedValue ||
      patch?.tags?.length
  );
}

export function DomainFormDialog({ open, onOpenChange, domain, initialPatch, onSaved }: Props) {
  const { t } = useTranslation();
  const workspaceId = useWorkspace().current?.id ?? null;
  const createMutation = useCreateDomain();
  const updateMutation = useUpdateDomain();
  const { data: folders } = useFoldersQuery();
  const mode = domain ? "update" : "create";
  const [advanced, setAdvanced] = useState(false);

  const schema = useMemo(() => createDomainFormSchema(mode), [mode]);

  const form = useForm<DomainFormValues>({
    resolver: zodResolver(schema) as Resolver<DomainFormValues>,
    defaultValues: EMPTY_DOMAIN_FORM,
    mode: "onBlur",
  });

  useEffect(() => {
    if (!open) return;
    const base = domain ? domainToFormValues(domain) : EMPTY_DOMAIN_FORM;
    form.reset(initialPatch ? { ...base, ...initialPatch } : base);
    setAdvanced(boolishAdvanced(domain, initialPatch));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, domain?.id]);

  const status = form.watch("status");
  const purchaseDate = form.watch("purchaseDate");
  const domainName = form.watch("domain");
  const currency = form.watch("purchaseCurrency");

  // Create mode: keep expiry one year ahead of purchase unless the user set it.
  useEffect(() => {
    if (mode !== "create" || !purchaseDate) return;
    if (form.getValues("expiryDate")) return;
    form.setValue("expiryDate", expiryAfterOneYear(purchaseDate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseDate, mode]);

  const busy = createMutation.isPending || updateMutation.isPending;
  const tld = getTld(domainName);

  function errorFor(name: keyof DomainFormValues) {
    const message = form.formState.errors[name]?.message;
    return typeof message === "string" ? t(message) : undefined;
  }

  async function onSubmit(values: DomainFormValues) {
    if (!workspaceId) return;

    if (mode === "create") {
      const exists = await domainExists(workspaceId, values.domain);
      if (exists) {
        form.setError("domain", { message: "domains.detail.duplicate" });
        toast.error(t("toast.duplicate"));
        return;
      }
    }

    const payload = formValuesToPayload(values);
    try {
      if (domain) {
        const updated = await updateMutation.mutateAsync({ previous: domain, values: payload });
        toast.success(t("domains.detail.updated", { domain: updated.domain }));
        onSaved?.(updated, "update");
      } else {
        const created = await createMutation.mutateAsync(payload);
        toast.success(t("domains.detail.created", { domain: created.domain }));
        onSaved?.(created, "create");
      }
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("toast.error");
      toast.error(message || t("toast.error"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={busy ? undefined : onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{domain ? t("domains.editTitle") : t("domains.addTitle")}</DialogTitle>
          <DialogDescription>
            {domain ? t("domains.editSubtitle", { domain: domain.domain }) : t("domains.addSubtitle")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {/* Identity */}
          <section className="space-y-3">
            <SectionHeading title={t("domains.form.identity")} hint={t("domains.form.identityHint")} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                id="domain"
                label={t("domains.form.domain")}
                required
                error={errorFor("domain")}
                hint={t("domains.form.domainHint")}
              >
                <Input
                  id="domain"
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={t("domains.form.domainPlaceholder")}
                  invalid={Boolean(form.formState.errors.domain)}
                  className="tabular"
                  {...form.register("domain")}
                />
              </Field>
              <Field id="tld" label={t("domains.form.tld")}>
                <div className="flex h-9 items-center rounded-md border border-dashed border-border-strong px-3 text-2sm tabular text-muted-foreground">
                  {tld ?? "—"}
                </div>
              </Field>
              <Field id="registrar" label={t("domains.form.registrar")} error={errorFor("registrar")}>
                <Input id="registrar" placeholder={t("domains.form.registrarPlaceholder")} {...form.register("registrar")} />
              </Field>
              <Field id="acquisition" label={t("domains.form.acquisitionSource")} error={errorFor("acquisitionSource")}>
                <Input
                  id="acquisition"
                  placeholder={t("domains.form.acquisitionSourcePlaceholder")}
                  {...form.register("acquisitionSource")}
                />
              </Field>
            </div>
          </section>

          <Separator />

          {/* Pricing */}
          <section className="space-y-3">
            <div className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2 text-2xs text-muted-foreground">
              <Info className="mt-px size-3.5 shrink-0" />
              <span>{t("domains.form.pricingHint")}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field
                id="purchasePrice"
                label={t("domains.form.purchasePrice")}
                required={mode === "create"}
                error={errorFor("purchasePrice")}
              >
                <Controller
                  control={form.control}
                  name="purchasePrice"
                  render={({ field }) => (
                    <CurrencyInput
                      id="purchasePrice"
                      value={field.value}
                      onValueChange={field.onChange}
                      currency={currency}
                      invalid={Boolean(form.formState.errors.purchasePrice)}
                    />
                  )}
                />
              </Field>
              <Field id="purchaseCurrency" label={t("domains.form.purchaseCurrency")}>
                <Controller
                  control={form.control}
                  name="purchaseCurrency"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={value => field.onChange(value as PurchaseCurrency)}>
                      <SelectTrigger id="purchaseCurrency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PURCHASE_CURRENCIES.map(code => (
                          <SelectItem key={code} value={code}>
                            {code} · {t(`currency.${code}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <Field
                id="renewalCost"
                label={t("domains.form.renewalCost")}
                error={errorFor("renewalCost")}
                hint={t("domains.form.renewalCostHint")}
              >
                <Controller
                  control={form.control}
                  name="renewalCost"
                  render={({ field }) => (
                    <CurrencyInput id="renewalCost" value={field.value} onValueChange={field.onChange} currency={currency} />
                  )}
                />
              </Field>
            </div>
          </section>

          <Separator />

          {/* Lifecycle */}
          <section className="space-y-3">
            <SectionHeading title={t("domains.form.lifecycle")} hint={t("domains.form.lifecycleHint")} />
            <div className="grid gap-3 sm:grid-cols-3">
              <Field
                id="purchaseDate"
                label={t("domains.form.purchaseDate")}
                required={mode === "create"}
                error={errorFor("purchaseDate")}
              >
                <Controller
                  control={form.control}
                  name="purchaseDate"
                  render={({ field }) => (
                    <DatePicker
                      id="purchaseDate"
                      value={field.value}
                      onChange={field.onChange}
                      invalid={Boolean(form.formState.errors.purchaseDate)}
                    />
                  )}
                />
              </Field>
              <Field
                id="expiryDate"
                label={t("domains.form.expiryDate")}
                error={errorFor("expiryDate")}
                hint={t("domains.form.expiryAutoHint")}
              >
                <Controller
                  control={form.control}
                  name="expiryDate"
                  render={({ field }) => (
                    <DatePicker
                      id="expiryDate"
                      value={field.value}
                      onChange={field.onChange}
                      invalid={Boolean(form.formState.errors.expiryDate)}
                    />
                  )}
                />
              </Field>
              <Field id="renewalDecision" label={t("domains.form.renewalDecision")}>
                <Controller
                  control={form.control}
                  name="renewalDecision"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="renewalDecision">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RENEWAL_DECISIONS.map(decision => (
                          <SelectItem key={decision} value={decision}>
                            {t(`decision.${decision}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="status" label={t("domains.form.status")} hint={t("domains.form.statusHint")}>
                <Controller
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DOMAIN_STATUSES.map(statusValue => (
                          <SelectItem key={statusValue} value={statusValue}>
                            {t(`status.${statusValue}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              {status !== "sold" ? (
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      form.setValue("status", "sold");
                      form.setValue("soldDate", toIsoDate(new Date()));
                    }}
                  >
                    {t("domains.form.markSold")}
                  </Button>
                </div>
              ) : (
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      form.setValue("status", "active");
                      form.setValue("soldDate", null);
                    }}
                  >
                    {t("domains.form.unmarkSold")}
                  </Button>
                </div>
              )}
            </div>
          </section>

          <Separator />

          {/* Listing */}
          <section className="space-y-3">
            <SectionHeading title={t("domains.form.listing")} hint={t("domains.form.listingHint")} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="listedOn" label={t("domains.form.listedOn")}>
                <Controller
                  control={form.control}
                  name="listedOn"
                  render={({ field }) => (
                    <TagInput
                      id="listedOn"
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={t("domains.form.listedOnPlaceholder")}
                    />
                  )}
                />
              </Field>
              <Field id="askingPrice" label={t("domains.form.askingPrice")} error={errorFor("askingPrice")}>
                <Controller
                  control={form.control}
                  name="askingPrice"
                  render={({ field }) => (
                    <CurrencyInput id="askingPrice" value={field.value} onValueChange={field.onChange} currency={currency} />
                  )}
                />
              </Field>
            </div>
          </section>

          <Separator />

          {/* Registry & flags */}
          <section className="space-y-3">
            <SectionHeading title={t("domains.form.registry")} hint={t("domains.form.registryHint")} />
            <div className="grid gap-3 sm:grid-cols-3">
              <Field id="folderId" label={t("domains.form.folder")}>
                <Controller
                  control={form.control}
                  name="folderId"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? REGISTRY_NONE}
                      onValueChange={value => field.onChange(value === REGISTRY_NONE ? null : value)}
                    >
                      <SelectTrigger id="folderId">
                        <SelectValue placeholder={t("domains.folder.none")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={REGISTRY_NONE}>{t("domains.folder.none")}</SelectItem>
                        {(folders ?? []).map(folder => (
                          <SelectItem key={folder.id} value={folder.id}>
                            {folder.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <Field id="registeredDate" label={t("domains.form.registeredDate")}>
                <Controller
                  control={form.control}
                  name="registeredDate"
                  render={({ field }) => (
                    <DatePicker id="registeredDate" value={field.value} onChange={field.onChange} />
                  )}
                />
              </Field>
              <Field id="minOffer" label={t("domains.form.minOffer")} error={errorFor("minOffer")}>
                <Controller
                  control={form.control}
                  name="minOffer"
                  render={({ field }) => (
                    <CurrencyInput id="minOffer" value={field.value} onValueChange={field.onChange} currency={currency} />
                  )}
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                id="registryStatus"
                label={t("domains.form.registryStatus")}
                hint={t("domains.form.registryStatusHint")}
              >
                <Controller
                  control={form.control}
                  name="registryStatus"
                  render={({ field }) => (
                    <Select
                      value={field.value || REGISTRY_NONE}
                      onValueChange={value => field.onChange(value === REGISTRY_NONE ? "" : value)}
                    >
                      <SelectTrigger id="registryStatus">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={REGISTRY_NONE}>{t("domains.filters.any")}</SelectItem>
                        {REGISTRY_STATUSES.map(status => (
                          <SelectItem key={status} value={status}>
                            {t(`lifecycle.${status}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <Field id="urlForwarding" label={t("domains.form.urlForwarding")} error={errorFor("urlForwarding")}>
                <Input id="urlForwarding" placeholder="https://…" spellCheck={false} {...form.register("urlForwarding")} />
              </Field>
            </div>

            <Field id="nameservers" label={t("domains.form.nameservers")}>
              <Controller
                control={form.control}
                name="nameservers"
                render={({ field }) => (
                  <TagInput
                    id="nameservers"
                    value={field.value}
                    onChange={field.onChange}
                    placeholder={t("domains.ns.placeholder")}
                  />
                )}
              />
            </Field>

            <div className="grid gap-2 sm:grid-cols-3">
              {REGISTRY_FLAGS.map(({ key, id }) => (
                <Controller
                  key={key}
                  control={form.control}
                  name={key}
                  render={({ field }) => (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                      <Label htmlFor={id} className="cursor-pointer text-2sm font-normal">
                        {t(`domains.form.${key}`)}
                      </Label>
                      <Switch id={id} checked={Boolean(field.value)} onCheckedChange={field.onChange} />
                    </div>
                  )}
                />
              ))}
            </div>
          </section>

          {/* Sale — only when relevant */}
          {status === "sold" || domain?.sold_date ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-3 overflow-hidden"
            >
              <Separator />
              <SectionHeading title={t("domains.form.sale")} hint={t("domains.form.saleHint")} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id="soldDate" label={t("domains.form.soldDate")} error={errorFor("soldDate")}>
                  <Controller
                    control={form.control}
                    name="soldDate"
                    render={({ field }) => (
                      <DatePicker
                        id="soldDate"
                        value={field.value}
                        onChange={field.onChange}
                        invalid={Boolean(form.formState.errors.soldDate)}
                      />
                    )}
                  />
                </Field>
                <Field id="salePlatform" label={t("domains.form.salePlatform")}>
                  <Input
                    id="salePlatform"
                    placeholder={t("domains.form.salePlatformPlaceholder")}
                    {...form.register("salePlatform")}
                  />
                </Field>
                <Field id="saleType" label={t("domains.form.saleType")}>
                  <Controller
                    control={form.control}
                    name="saleType"
                    render={({ field }) => (
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <SelectTrigger id="saleType">
                          <SelectValue placeholder={t("domains.filters.any")} />
                        </SelectTrigger>
                        <SelectContent>
                          {SALE_TYPES.map(type => (
                            <SelectItem key={type} value={type}>
                              {t(`saleType.${type}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
                <Field id="salePrice" label={t("domains.form.salePrice")}>
                  <Controller
                    control={form.control}
                    name="salePrice"
                    render={({ field }) => (
                      <CurrencyInput id="salePrice" value={field.value} onValueChange={field.onChange} currency={currency} />
                    )}
                  />
                </Field>
                <Field
                  id="netProceeds"
                  label={t("domains.form.netProceeds")}
                  hint={t("domains.form.netProceedsHint")}
                  className="sm:col-span-2"
                >
                  <Controller
                    control={form.control}
                    name="netProceeds"
                    render={({ field }) => (
                      <CurrencyInput id="netProceeds" value={field.value} onValueChange={field.onChange} currency={currency} />
                    )}
                  />
                </Field>
              </div>
            </motion.div>
          ) : null}

          <Separator />

          {/* Details */}
          <section className="space-y-3">
            <SectionHeading title={t("domains.form.details")} hint={t("domains.form.detailsHint")} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="niche" label={t("domains.form.niche")}>
                <Controller
                  control={form.control}
                  name="niche"
                  render={({ field }) => (
                    <>
                      <Input
                        id="niche"
                        list="niche-options"
                        placeholder={t("domains.form.nichePlaceholder")}
                        value={field.value}
                        onChange={field.onChange}
                      />
                      <datalist id="niche-options">
                        {NICHES.map(niche => (
                          <option key={niche} value={niche} />
                        ))}
                      </datalist>
                    </>
                  )}
                />
              </Field>
              <Field id="tags" label={t("domains.form.tags")}>
                <Controller
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <TagInput id="tags" value={field.value} onChange={field.onChange} placeholder={t("domains.form.tagsPlaceholder")} />
                  )}
                />
              </Field>
            </div>

            <button
              type="button"
              onClick={() => setAdvanced(value => !value)}
              className="flex items-center gap-1.5 text-2xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronDown className={cn("size-3.5 transition-transform", advanced && "rotate-180")} />
              {t("domains.form.advanced")}
            </button>

            {advanced ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-3 overflow-hidden"
              >
                <Field id="estimatedValue" label={t("domains.form.estimatedValue")}>
                  <Controller
                    control={form.control}
                    name="estimatedValue"
                    render={({ field }) => (
                      <CurrencyInput
                        id="estimatedValue"
                        value={field.value}
                        onValueChange={field.onChange}
                        currency={currency}
                      />
                    )}
                  />
                </Field>
              </motion.div>
            ) : null}

            <Field id="notes" label={t("domains.form.notes")}>
              <Textarea id="notes" placeholder={t("domains.form.notesPlaceholder")} rows={3} {...form.register("notes")} />
            </Field>
          </section>

          <DialogFooter className="sticky bottom-0 -mx-6 -mb-6 gap-2 border-t border-border bg-popover px-6 py-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="primary" loading={busy}>
              {domain ? t("common.saveChanges") : t("common.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
