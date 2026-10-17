import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
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
import { FOLDER_COLORS, DEFAULT_FOLDER_COLOR } from "@/lib/constants";
import { folderColorClass } from "@/features/domains/folder-colors";
import type { DerivedDomain } from "@/lib/domain-rules";
import { cn } from "@/lib/utils";

/* ------------------------------- new folder -------------------------------- */

export function NewFolderDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: { name: string; color: string }) => Promise<void> | void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(DEFAULT_FOLDER_COLOR);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setColor(DEFAULT_FOLDER_COLOR);
    }
  }, [open]);

  async function submit() {
    if (!name.trim()) return;
    try {
      setBusy(true);
      await onCreate({ name: name.trim(), color });
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={busy ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("domains.folder.newTitle")}</DialogTitle>
          <DialogDescription>{t("domains.folder.newBody")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Field id="folder-name" label={t("domains.folder.name")} required>
            <Input
              id="folder-name"
              autoFocus
              value={name}
              maxLength={80}
              placeholder={t("domains.folder.namePlaceholder")}
              onChange={event => setName(event.target.value)}
              onKeyDown={event => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void submit();
                }
              }}
            />
          </Field>

          <Field id="folder-color" label={t("domains.folder.color")}>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("domains.folder.color")}>
              {FOLDER_COLORS.map(option => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={color === option}
                  aria-label={option}
                  onClick={() => setColor(option)}
                  className={cn(
                    "size-6 rounded-full ring-offset-2 ring-offset-popover transition-all",
                    folderColorClass(option).dot,
                    color === option ? "ring-2 ring-ring" : "opacity-70 hover:opacity-100"
                  )}
                />
              ))}
            </div>
          </Field>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" onClick={() => void submit()} loading={busy} disabled={!name.trim()}>
            {t("common.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------- URL forwarding ------------------------------ */

export function UrlForwardingDialog({
  open,
  onOpenChange,
  domain,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: DerivedDomain | null;
  onSave: (value: string) => Promise<void> | void;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setValue(domain?.url_forwarding ?? "");
  }, [open, domain?.id, domain?.url_forwarding]);

  async function submit() {
    try {
      setBusy(true);
      await onSave(value.trim());
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={busy ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("domains.url.title")}</DialogTitle>
          <DialogDescription>
            {t("domains.url.body", { domain: domain?.domain ?? "" })}
          </DialogDescription>
        </DialogHeader>

        <Field id="url-forwarding" label={t("domains.url.label")} hint={t("domains.url.hint")}>
          <Input
            id="url-forwarding"
            autoFocus
            inputMode="url"
            spellCheck={false}
            placeholder="https://example.com/landing"
            value={value}
            onChange={event => setValue(event.target.value)}
            onKeyDown={event => {
              if (event.key === "Enter") {
                event.preventDefault();
                void submit();
              }
            }}
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

/* ------------------------------- nameservers ------------------------------- */

export function NameserversDialog({
  open,
  onOpenChange,
  domain,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: DerivedDomain | null;
  onSave: (nameservers: string[]) => Promise<void> | void;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setValue(domain?.nameservers ?? []);
  }, [open, domain?.id, domain?.nameservers]);

  async function submit() {
    try {
      setBusy(true);
      await onSave(value.map(item => item.trim()).filter(Boolean));
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={busy ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("domains.ns.title")}</DialogTitle>
          <DialogDescription>{t("domains.ns.body", { domain: domain?.domain ?? "" })}</DialogDescription>
        </DialogHeader>

        <Field id="nameservers" label={t("domains.ns.label")} hint={t("domains.ns.hint")}>
          <TagInput
            id="nameservers"
            value={value}
            onChange={setValue}
            placeholder={t("domains.ns.placeholder")}
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
