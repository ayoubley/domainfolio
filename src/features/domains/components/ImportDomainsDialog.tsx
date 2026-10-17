import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, Sparkles, Upload, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { DatePicker } from "@/components/shared/DatePicker";
import { Field } from "@/components/shared/Field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useBulkCreateDomains, useDomainsQuery } from "@/features/domains/queries";
import {
  IMPORT_FIELDS,
  MAPPABLE_FIELDS,
  autoMapColumns,
  importTemplateCsv,
  parseDomainList,
  readSheetFile,
  resolveImportRows,
  type ColumnMapping,
  type ImportDefaults,
  type ImportField,
  type ParsedSheet,
} from "@/features/domains/import";
import { PURCHASE_CURRENCIES } from "@/lib/constants";
import { toIsoDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PurchaseCurrency } from "@/types/database";

const NOT_MAPPED = "__unmapped__";

/**
 * `domains.form.*` labels are the camelCase of the snake_case column
 * (`purchase_price` → `purchasePrice`), so the key derives from the field.
 */
function formLabelKey(field: ImportField): string {
  return `domains.form.${field.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())}`;
}

function emptyDefaults(): ImportDefaults {
  return {
    purchaseDate: toIsoDate(new Date()),
    purchasePrice: null,
    registrar: "",
    currency: "USD",
    autoRenew: true,
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Offered as a secondary path for a rich single-domain record. */
  onRequestSingle?: () => void;
  onImported?: (count: number) => void;
};

/**
 * Two ways in, one pipeline out: a pasted list of names or a spreadsheet.
 * Everything funnels through `resolveImportRows`, so both tabs share the same
 * Zod validation, duplicate detection and summary.
 */
export function ImportDomainsDialog({ open, onOpenChange, onRequestSingle, onImported }: Props) {
  const { t } = useTranslation();
  const bulkCreate = useBulkCreateDomains();
  const { data: allDomains } = useDomainsQuery(true);

  const [tab, setTab] = useState("names");
  const [namesText, setNamesText] = useState("");
  const [defaults, setDefaults] = useState<ImportDefaults>(emptyDefaults);
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [fileName, setFileName] = useState("");
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [reading, setReading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // A file/text from last time shouldn't leak into a fresh open.
  useEffect(() => {
    if (open) return;
    setNamesText("");
    setSheet(null);
    setFileName("");
    setMapping({});
  }, [open]);

  const existingDomains = useMemo(
    () => new Set((allDomains ?? []).map(row => row.domain)),
    [allDomains]
  );

  /* ------------------------------ raw row sources ----------------------------- */

  const nameRaws = useMemo(
    () => parseDomainList(namesText).map((domain, index) => ({ line: index + 1, cells: { domain } })),
    [namesText]
  );

  const csvRaws = useMemo(() => {
    if (!sheet) return [];
    return sheet.rows.map((row, index) => {
      const cells: Partial<Record<ImportField, string>> = {};
      for (const field of IMPORT_FIELDS) {
        const header = mapping[field];
        if (header) cells[field] = row[header] ?? "";
      }
      return { line: index + 2, cells };
    });
  }, [sheet, mapping]);

  const raws = tab === "names" ? nameRaws : csvRaws;

  const preview = useMemo(
    () => resolveImportRows({ raws, defaults, existingDomains }),
    [raws, defaults, existingDomains]
  );

  const issues = useMemo(
    () => preview.rows.filter(row => row.duplicate || row.errors.length > 0).slice(0, 8),
    [preview.rows]
  );

  const previewRows = useMemo(() => preview.valid.slice(0, 5), [preview.valid]);

  const busy = bulkCreate.isPending || reading;
  const canImport = preview.valid.length > 0 && !busy;

  /* --------------------------------- handlers -------------------------------- */

  function issueText(code: string): string {
    const separator = code.indexOf(":");
    const key = separator === -1 ? code : code.slice(0, separator);
    const field = separator === -1 ? "" : code.slice(separator + 1);
    const message = t(key);
    if (!field) return message;
    return `${t(formLabelKey(field as ImportField))} — ${message}`;
  }

  async function handleFile(file: File) {
    setReading(true);
    try {
      const parsed = await readSheetFile(file);
      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        toast.error(t("domains.import.emptyFile"));
        return;
      }
      setSheet(parsed);
      setFileName(file.name);
      setMapping(autoMapColumns(parsed.headers));
    } catch {
      toast.error(t("domains.import.readFailed"));
    } finally {
      setReading(false);
    }
  }

  function downloadTemplate() {
    const blob = new Blob([importTemplateCsv()], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "domainfolio-import-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport() {
    const payloads = preview.valid.map(row => row.values as Record<string, unknown>);
    if (payloads.length === 0) return;
    try {
      const created = await bulkCreate.mutateAsync(payloads);
      toast.success(t("domains.import.done", { count: created.length }));
      onImported?.(created.length);
      setNamesText("");
      setSheet(null);
      setFileName("");
      setMapping({});
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      toast.error(/duplicate|unique/i.test(message) ? t("domains.import.duplicateHint") : message || t("toast.error"));
    }
  }

  /* ---------------------------------- render --------------------------------- */

  return (
    <Dialog open={open} onOpenChange={busy ? undefined : onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("domains.import.title")}</DialogTitle>
          <DialogDescription>{t("domains.import.subtitle")}</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="w-full">
            <TabsTrigger value="names" className="flex-1">
              {t("domains.import.tabNames")}
            </TabsTrigger>
            <TabsTrigger value="csv" className="flex-1">
              {t("domains.import.tabCsv")}
            </TabsTrigger>
          </TabsList>

          {/* ------------------------------ Enter names ----------------------------- */}
          <TabsContent value="names" className="space-y-2">
            <Field
              id="import-names"
              label={t("domains.import.namesLabel")}
              hint={t("domains.import.namesHint")}
              labelAccessory={
                <span className="text-2xs tabular text-muted-foreground">
                  {t("domains.import.namesCount", { count: nameRaws.length })}
                </span>
              }
            >
              <Textarea
                id="import-names"
                rows={8}
                spellCheck={false}
                autoComplete="off"
                dir="ltr"
                className="font-mono text-2sm"
                placeholder={t("domains.import.namesPlaceholder")}
                value={namesText}
                onChange={event => setNamesText(event.target.value)}
              />
            </Field>
          </TabsContent>

          {/* ------------------------------ CSV upload ------------------------------ */}
          <TabsContent value="csv" className="space-y-3">
            {sheet ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
                <FileSpreadsheet className="size-4 shrink-0 text-primary" />
                <span className="truncate text-2sm font-medium">{fileName}</span>
                <span className="text-2xs tabular text-muted-foreground">
                  {t("domains.import.sheetRows", { count: sheet.rows.length })}
                </span>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="ms-auto"
                  aria-label={t("domains.import.removeFile")}
                  onClick={() => {
                    setSheet(null);
                    setFileName("");
                    setMapping({});
                    if (fileInput.current) fileInput.current.value = "";
                  }}
                >
                  <X />
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <label
                  onDragOver={event => event.preventDefault()}
                  onDrop={event => {
                    event.preventDefault();
                    const file = event.dataTransfer.files?.[0];
                    if (file) void handleFile(file);
                  }}
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong bg-card px-4 py-8 text-center transition-colors",
                    "hover:border-primary/60 hover:bg-primary-soft/30 focus-within:ring-2 focus-within:ring-ring/25"
                  )}
                >
                  <input
                    ref={fileInput}
                    type="file"
                    accept=".csv,.xlsx,.xls,text/csv"
                    className="sr-only"
                    onChange={event => {
                      const file = event.target.files?.[0];
                      if (file) void handleFile(file);
                    }}
                  />
                  {reading ? (
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  ) : (
                    <Upload className="size-5 text-muted-foreground" />
                  )}
                  <span className="text-2sm font-medium text-foreground">{t("domains.import.dropTitle")}</span>
                  <span className="text-2xs text-muted-foreground">{t("domains.import.dropHint")}</span>
                </label>

                <div className="flex items-center justify-between gap-2">
                  <p className="text-2xs text-muted-foreground">{t("domains.import.csvHint")}</p>
                  <Button type="button" size="sm" variant="ghost" onClick={downloadTemplate}>
                    <Download />
                    {t("domains.import.template")}
                  </Button>
                </div>
              </div>
            )}

            {sheet ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-2sm font-semibold">{t("domains.import.mapping")}</h4>
                  <span className="text-2xs text-muted-foreground">{t("domains.import.mappingHint")}</span>
                </div>
                <div className="grid max-h-52 grid-cols-1 gap-2 overflow-y-auto pe-1 sm:grid-cols-2">
                  {MAPPABLE_FIELDS.map(field => (
                    <div key={field} className="flex items-center gap-2">
                      <span className="w-32 shrink-0 truncate text-2xs text-muted-foreground">
                        {t(formLabelKey(field))}
                      </span>
                      <Select
                        value={mapping[field] ?? NOT_MAPPED}
                        onValueChange={value =>
                          setMapping(current => {
                            const next = { ...current };
                            if (value === NOT_MAPPED) delete next[field];
                            else next[field] = value;
                            return next;
                          })
                        }
                      >
                        <SelectTrigger aria-label={t(formLabelKey(field))}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NOT_MAPPED}>{t("domains.import.notMapped")}</SelectItem>
                          {sheet.headers.map(header => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </TabsContent>
        </Tabs>

        <Separator />

        {/* ------------------------- defaults applied to rows ------------------------- */}
        <section className="space-y-3">
          <div>
            <h4 className="text-2sm font-semibold">{t("domains.import.defaults")}</h4>
            <p className="text-2xs text-muted-foreground">{t("domains.import.defaultsHint")}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field id="import-price" label={t("domains.form.purchasePrice")}>
              <CurrencyInput
                id="import-price"
                value={defaults.purchasePrice}
                onValueChange={value => setDefaults(current => ({ ...current, purchasePrice: value }))}
                currency={defaults.currency}
              />
            </Field>
            <Field id="import-date" label={t("domains.form.purchaseDate")}>
              <DatePicker
                id="import-date"
                value={defaults.purchaseDate}
                onChange={value => setDefaults(current => ({ ...current, purchaseDate: value }))}
              />
            </Field>
            <Field id="import-registrar" label={t("domains.form.registrar")}>
              <Input
                id="import-registrar"
                autoComplete="off"
                placeholder={t("domains.form.registrarPlaceholder")}
                value={defaults.registrar}
                onChange={event => setDefaults(current => ({ ...current, registrar: event.target.value }))}
              />
            </Field>
            <Field id="import-currency" label={t("domains.form.purchaseCurrency")}>
              <Select
                value={defaults.currency}
                onValueChange={value => setDefaults(current => ({ ...current, currency: value as PurchaseCurrency }))}
              >
                <SelectTrigger id="import-currency">
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
            </Field>
          </div>

          <label
            htmlFor="import-auto-renew"
            className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
          >
            <span className="space-y-0.5">
              <span className="block text-2sm font-medium">{t("domains.form.autoRenew")}</span>
              <span className="block text-2xs text-muted-foreground">{t("domains.import.autoRenewHint")}</span>
            </span>
            <Checkbox
              id="import-auto-renew"
              checked={defaults.autoRenew}
              onCheckedChange={checked =>
                setDefaults(current => ({ ...current, autoRenew: checked === true }))
              }
            />
          </label>
        </section>

        {/* --------------------------------- summary -------------------------------- */}
        {raws.length > 0 ? (
          <section className="space-y-2">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border bg-muted/40 px-3 py-2 text-2xs">
              <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                {t("domains.import.ready", { count: preview.valid.length })}
              </span>
              {preview.duplicates.length > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="size-3.5" />
                  {t("domains.import.duplicates", { count: preview.duplicates.length })}
                </span>
              ) : null}
              {preview.invalid.length > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-destructive">
                  <AlertTriangle className="size-3.5" />
                  {t("domains.import.errors", { count: preview.invalid.length })}
                </span>
              ) : null}
            </div>

            {issues.length > 0 ? (
              <ul className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-border px-3 py-2">
                {issues.map(issue => (
                  <li key={issue.line} className="flex items-start gap-2 text-2xs">
                    <span className="tabular text-muted-foreground">
                      {t("domains.import.line", { line: issue.line })}
                    </span>
                    <span className="truncate font-medium text-foreground" dir="ltr">
                      {issue.domain || t("domains.import.blankRow")}
                    </span>
                    <span className="ms-auto shrink-0 text-destructive">
                      {issue.duplicate
                        ? t("domains.import.rowDuplicate")
                        : issue.errors.map(issueText).join(", ")}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            {previewRows.length > 0 ? (
              <div className="rounded-lg border border-border">
                <div className="flex items-center gap-1.5 border-b border-border px-3 py-1.5 text-2xs font-medium text-muted-foreground">
                  <Sparkles className="size-3.5" />
                  {t("domains.import.preview")}
                </div>
                <ul className="divide-y divide-border">
                  {previewRows.map(row => (
                    <li key={row.line} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-1.5 text-2xs">
                      <span className="font-medium text-foreground" dir="ltr">
                        {row.domain}
                      </span>
                      {row.values?.purchase_price != null ? (
                        <span className="tabular text-muted-foreground">
                          {row.values.purchase_price} {row.values.purchase_currency}
                        </span>
                      ) : null}
                      {row.values?.expiry_date ? (
                        <span className="tabular text-muted-foreground">
                          {t("domains.columns.expiryDate")}: {row.values.expiry_date}
                        </span>
                      ) : null}
                      {row.values?.registrar ? (
                        <span className="text-muted-foreground">{row.values.registrar}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}

        <DialogFooter className="gap-2">
          {onRequestSingle ? (
            <Button
              type="button"
              variant="link"
              className="me-auto px-0"
              disabled={busy}
              onClick={() => {
                onOpenChange(false);
                onRequestSingle();
              }}
            >
              {t("domains.import.singleInstead")}
            </Button>
          ) : null}
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button type="button" variant="primary" loading={bulkCreate.isPending} disabled={!canImport} onClick={handleImport}>
            {t("domains.import.confirm", { count: preview.valid.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
