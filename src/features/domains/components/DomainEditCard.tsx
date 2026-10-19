import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { DatePicker } from "@/components/shared/DatePicker";
import { Field } from "@/components/shared/Field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PURCHASE_CURRENCIES } from "@/lib/constants";
import { toIsoDate } from "@/lib/format";
import { RegistrarSelect } from "@/features/domains/components/RegistrarSelect";
import type { DerivedDomain } from "@/lib/domain-rules";
import type { PurchaseCurrency } from "@/types/database";

/**
 * The record page's edit card: what the domain cost, where it came from, and the
 * one-tap sale. Deliberately small — the rest of the record stays read-only.
 */
export function DomainEditCard({
  open,
  onOpenChange,
  domain,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: DerivedDomain | null;
  onSubmit: (input: {
    purchasePrice: number | null;
    purchaseDate: string | null;
    registrar: string;
    currency: PurchaseCurrency;
    autoRenew: boolean;
    markSold: boolean;
    soldDate: string | null;
    salePrice: number | null;
    saleNotes: string;
  }) => Promise<void> | void;
}) {
  const { t } = useTranslation();
  const [price, setPrice] = useState<number | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [registrar, setRegistrar] = useState("");
  const [currency, setCurrency] = useState<PurchaseCurrency>("USD");
  const [autoRenew, setAutoRenew] = useState(false);
  const [markSold, setMarkSold] = useState(false);
  const [soldDate, setSoldDate] = useState<string | null>(null);
  const [salePrice, setSalePrice] = useState<number | null>(null);
  const [saleNotes, setSaleNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPrice(domain?.purchase_price ?? null);
    setDate(domain?.purchase_date ?? null);
    setRegistrar(domain?.registrar ?? "");
    setCurrency(domain?.purchase_currency ?? "USD");
    setAutoRenew(domain?.auto_renew ?? false);
    setMarkSold(false);
    setSoldDate(toIsoDate(new Date()));
    setSalePrice(domain?.sale_price ?? null);
    setSaleNotes(domain?.notes ?? "");
  }, [
    open,
    domain?.id,
    domain?.purchase_price,
    domain?.purchase_date,
    domain?.registrar,
    domain?.purchase_currency,
    domain?.auto_renew,
    domain?.sale_price,
    domain?.notes,
  ]);

  async function submit() {
    try {
      setBusy(true);
      await onSubmit({
        purchasePrice: price,
        purchaseDate: date,
        registrar: registrar.trim(),
        currency,
        autoRenew,
        markSold,
        soldDate: soldDate || null,
        salePrice,
        saleNotes: saleNotes.trim(),
      });
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  const currencyOptions = PURCHASE_CURRENCIES.map(code => (
    <SelectItem key={code} value={code}>
      {code} · {t(`currency.${code}`)}
    </SelectItem>
  ));

  return (
    <Dialog open={open} onOpenChange={busy ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle dir="ltr" className="tabular text-start">
            {domain?.domain ?? ""}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="edit-price" label={t("domains.form.purchasePrice")}>
            <CurrencyInput id="edit-price" value={price} onValueChange={setPrice} currency={currency} />
          </Field>
          <Field id="edit-date" label={t("domains.form.purchaseDate")}>
            <DatePicker id="edit-date" value={date} onChange={setDate} />
          </Field>
          <Field id="edit-registrar" label={t("domains.form.registrar")}>
            <RegistrarSelect id="edit-registrar" value={registrar} onChange={setRegistrar} />
          </Field>
          <Field id="edit-currency" label={t("domains.form.purchaseCurrency")}>
            <Select value={currency} onValueChange={value => setCurrency(value as PurchaseCurrency)}>
              <SelectTrigger id="edit-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>{currencyOptions}</SelectContent>
            </Select>
          </Field>
        </div>

        <label
          htmlFor="edit-auto-renew"
          className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
        >
          <span className="space-y-0.5">
            <span className="block text-2sm font-medium">{t("domains.form.autoRenew")}</span>
            <span className="block text-2xs text-muted-foreground">{t("domains.import.autoRenewHint")}</span>
          </span>
          <Checkbox
            id="edit-auto-renew"
            checked={autoRenew}
            onCheckedChange={checked => setAutoRenew(checked === true)}
          />
        </label>

        {/* Mark as sold — the small window under the purchase card. */}
        <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-3">
          <label htmlFor="edit-mark-sold" className="flex cursor-pointer items-start justify-between gap-3">
            <span className="space-y-0.5">
              <span className="block text-2sm font-medium">{t("domains.sold.title")}</span>
              <span className="block text-2xs text-muted-foreground">{t("domains.sold.body")}</span>
            </span>
            <Checkbox
              id="edit-mark-sold"
              checked={markSold}
              onCheckedChange={checked => setMarkSold(checked === true)}
            />
          </label>

          {markSold ? (
            <div className="space-y-3 border-t border-border pt-3">
              <Field id="edit-sold-date" label={t("domains.sold.date")}>
                <DatePicker id="edit-sold-date" value={soldDate} onChange={setSoldDate} />
              </Field>
              <Field id="edit-sold-amount" label={t("domains.sold.amount")}>
                <CurrencyInput
                  id="edit-sold-amount"
                  value={salePrice}
                  onValueChange={setSalePrice}
                  currency={currency}
                />
              </Field>
              <Field id="edit-sold-currency" label={t("domains.sold.currency")}>
                <Select value={currency} onValueChange={value => setCurrency(value as PurchaseCurrency)}>
                  <SelectTrigger id="edit-sold-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>{currencyOptions}</SelectContent>
                </Select>
              </Field>
              <Field id="edit-sold-notes" label={t("domains.sold.notes")}>
                <Textarea
                  id="edit-sold-notes"
                  rows={3}
                  placeholder={t("domains.form.notesPlaceholder")}
                  value={saleNotes}
                  onChange={event => setSaleNotes(event.target.value)}
                />
              </Field>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" onClick={() => void submit()} loading={busy}>
            {markSold ? t("domains.sold.confirm") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
