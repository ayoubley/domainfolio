import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { DatePicker } from "@/components/shared/DatePicker";
import { Field } from "@/components/shared/Field";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PURCHASE_CURRENCIES } from "@/lib/constants";
import type { DerivedDomain } from "@/lib/domain-rules";
import { toIsoDate } from "@/lib/format";
import type { PurchaseCurrency } from "@/types/database";

/* ---------------------------- purchase details ----------------------------- */

export function PurchaseDetailsDialog({
  open,
  onOpenChange,
  domain,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: DerivedDomain | null;
  onSave: (input: {
    purchasePrice: number | null;
    purchaseDate: string | null;
    registrar: string;
    currency: PurchaseCurrency;
  }) => Promise<void> | void;
}) {
  const { t } = useTranslation();
  const [price, setPrice] = useState<number | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [registrar, setRegistrar] = useState("");
  const [currency, setCurrency] = useState<PurchaseCurrency>("USD");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPrice(domain?.purchase_price ?? null);
    setDate(domain?.purchase_date ?? null);
    setRegistrar(domain?.registrar ?? "");
    setCurrency(domain?.purchase_currency ?? "USD");
  }, [open, domain?.id, domain?.purchase_price, domain?.purchase_date, domain?.registrar, domain?.purchase_currency]);

  async function submit() {
    try {
      setBusy(true);
      await onSave({ purchasePrice: price, purchaseDate: date, registrar: registrar.trim(), currency });
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={busy ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("domains.purchase.title")}</DialogTitle>
          <DialogDescription>
            {t("domains.purchase.body", { domain: domain?.domain ?? "" })}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="purchase-price" label={t("domains.form.purchasePrice")}>
            <CurrencyInput id="purchase-price" value={price} onValueChange={setPrice} currency={currency} />
          </Field>
          <Field id="purchase-date" label={t("domains.form.purchaseDate")}>
            <DatePicker id="purchase-date" value={date} onChange={setDate} />
          </Field>
          <Field id="purchase-registrar" label={t("domains.form.registrar")}>
            <Input
              id="purchase-registrar"
              autoComplete="off"
              placeholder={t("domains.form.registrarPlaceholder")}
              value={registrar}
              onChange={event => setRegistrar(event.target.value)}
            />
          </Field>
          <Field id="purchase-currency" label={t("domains.form.purchaseCurrency")}>
            <Select value={currency} onValueChange={value => setCurrency(value as PurchaseCurrency)}>
              <SelectTrigger id="purchase-currency">
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

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" onClick={() => void submit()} loading={busy}>
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------- pricing --------------------------------- */

export function PricingDialog({
  open,
  onOpenChange,
  domain,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: DerivedDomain | null;
  onSave: (input: { askingPrice: number | null; minOffer: number | null }) => Promise<void> | void;
}) {
  const { t } = useTranslation();
  const [askingPrice, setAskingPrice] = useState<number | null>(null);
  const [minOffer, setMinOffer] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const currency = domain?.purchase_currency ?? "USD";

  useEffect(() => {
    if (!open) return;
    setAskingPrice(domain?.asking_price ?? null);
    setMinOffer(domain?.min_offer ?? null);
  }, [open, domain?.id, domain?.asking_price, domain?.min_offer]);

  async function submit() {
    try {
      setBusy(true);
      await onSave({ askingPrice, minOffer });
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={busy ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("domains.pricing.title")}</DialogTitle>
          <DialogDescription>
            {t("domains.pricing.body", { domain: domain?.domain ?? "" })}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="asking-price" label={t("domains.form.askingPrice")}>
            <CurrencyInput
              id="asking-price"
              value={askingPrice}
              onValueChange={setAskingPrice}
              currency={currency}
            />
          </Field>
          <Field id="min-offer" label={t("domains.form.minOffer")}>
            <CurrencyInput id="min-offer" value={minOffer} onValueChange={setMinOffer} currency={currency} />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" onClick={() => void submit()} loading={busy}>
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------- notes ---------------------------------- */

export function NotesDialog({
  open,
  onOpenChange,
  domain,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: DerivedDomain | null;
  onSave: (notes: string) => Promise<void> | void;
}) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNotes(domain?.notes ?? "");
  }, [open, domain?.id, domain?.notes]);

  async function submit() {
    try {
      setBusy(true);
      await onSave(notes.trim());
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={busy ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("domains.notes.title")}</DialogTitle>
          <DialogDescription>{t("domains.notes.body", { domain: domain?.domain ?? "" })}</DialogDescription>
        </DialogHeader>

        <Field id="domain-notes" label={t("domains.form.notes")}>
          <Textarea
            id="domain-notes"
            rows={6}
            autoFocus
            placeholder={t("domains.form.notesPlaceholder")}
            value={notes}
            onChange={event => setNotes(event.target.value)}
          />
        </Field>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" onClick={() => void submit()} loading={busy}>
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------- renew ---------------------------------- */

export function RenewDomainDialog({
  open,
  onOpenChange,
  domain,
  currency,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: DerivedDomain | null;
  currency: string;
  onConfirm: (input: { renewalCost: number | null; note: string | null }) => Promise<void> | void;
}) {
  const { t } = useTranslation();
  const [cost, setCost] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setCost(domain?.renewal_cost ?? null);
      setNote("");
    }
  }, [open, domain?.id, domain?.renewal_cost]);

  async function submit() {
    try {
      setBusy(true);
      await onConfirm({ renewalCost: cost, note: note.trim() || null });
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={busy ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("domains.renew.title")}</DialogTitle>
          <DialogDescription>
            {t("domains.renew.body", { domain: domain?.domain ?? "" })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Field id="renew-cost" label={t("domains.renew.cost")} hint={t("domains.form.renewalCostHint")}>
            <CurrencyInput id="renew-cost" value={cost} onValueChange={setCost} currency={currency} />
          </Field>
          <Field id="renew-note" label={t("domains.renew.note")}>
            <Input id="renew-note" value={note} onChange={event => setNote(event.target.value)} />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" onClick={() => void submit()} loading={busy}>
            {t("domains.renew.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------- mark as sold ------------------------------ */

/**
 * The one-screen sale record: date, amount, currency and a note. Saving marks
 * the domain as sold and parks it in the archive, exactly as the copy says.
 */
export function MarkAsSoldDialog({
  open,
  onOpenChange,
  domain,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: DerivedDomain | null;
  onConfirm: (input: {
    soldDate: string | null;
    salePrice: number | null;
    currency: PurchaseCurrency;
    notes: string;
  }) => Promise<void> | void;
}) {
  const { t } = useTranslation();
  const [soldDate, setSoldDate] = useState<string | null>(null);
  const [salePrice, setSalePrice] = useState<number | null>(null);
  const [currency, setCurrency] = useState<PurchaseCurrency>("USD");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSoldDate(domain?.sold_date ?? toIsoDate(new Date()));
    setSalePrice(domain?.sale_price ?? null);
    setCurrency(domain?.purchase_currency ?? "USD");
    setNotes(domain?.notes ?? "");
  }, [open, domain?.id, domain?.sold_date, domain?.sale_price, domain?.purchase_currency, domain?.notes]);

  async function submit() {
    try {
      setBusy(true);
      await onConfirm({ soldDate: soldDate || null, salePrice, currency, notes: notes.trim() });
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={busy ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("domains.sold.title")}</DialogTitle>
          <DialogDescription className="space-y-1">
            <span dir="ltr" className="block font-medium tabular text-foreground">
              {domain?.domain ?? ""}
            </span>
            <span className="block">{t("domains.sold.body")}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Field id="sold-date" label={t("domains.sold.date")}>
            <DatePicker id="sold-date" value={soldDate} onChange={setSoldDate} />
          </Field>
          <Field id="sold-amount" label={t("domains.sold.amount")}>
            <CurrencyInput id="sold-amount" value={salePrice} onValueChange={setSalePrice} currency={currency} />
          </Field>
          <Field id="sold-currency" label={t("domains.sold.currency")}>
            <Select value={currency} onValueChange={value => setCurrency(value as PurchaseCurrency)}>
              <SelectTrigger id="sold-currency">
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
          <Field id="sold-notes" label={t("domains.sold.notes")}>
            <Textarea
              id="sold-notes"
              rows={3}
              placeholder={t("domains.form.notesPlaceholder")}
              value={notes}
              onChange={event => setNotes(event.target.value)}
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" onClick={() => void submit()} loading={busy}>
            {t("domains.sold.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
