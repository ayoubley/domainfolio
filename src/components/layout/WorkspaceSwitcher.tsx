import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/shared/Field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkspace } from "@/hooks/useWorkspace";
import { PURCHASE_CURRENCIES } from "@/lib/constants";
import type { PurchaseCurrency } from "@/types/database";
import { cn } from "@/lib/utils";

export function WorkspaceSwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const { t } = useTranslation();
  const { workspaces, current, switchWorkspace, createWorkspace } = useWorkspace();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState<PurchaseCurrency>("USD");
  const [busy, setBusy] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setBusy(true);
    const created = await createWorkspace({ name: name.trim(), defaultCurrency: currency });
    setBusy(false);
    if (created) {
      toast.success(t("workspace.created"));
      setCreating(false);
      setName("");
    } else {
      toast.error(t("toast.error"));
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t("workspace.switch")}
            className={cn(
              "group flex w-full items-center gap-2.5 rounded-lg border border-transparent p-1.5 text-start transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
              collapsed && "justify-center"
            )}
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
              <Building2 className="size-3.5" />
            </span>
            {collapsed ? null : (
              <>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-2sm font-medium text-foreground">
                    {current?.name ?? t("workspace.personal")}
                  </span>
                  <span className="block truncate text-2xs text-muted-foreground">
                    {current ? t(`workspace.${current.role}`) : "—"}
                  </span>
                </span>
                <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
              </>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuLabel>{t("workspace.label")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {workspaces.map(workspace => (
            <DropdownMenuItem key={workspace.id} onClick={() => switchWorkspace(workspace.id)}>
              <span className="flex size-4 items-center justify-center">
                {workspace.id === current?.id ? <Check /> : null}
              </span>
              <span className="flex-1 truncate">{workspace.name}</span>
              <span className="text-2xs text-muted-foreground">{t(`workspace.${workspace.role}`)}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCreating(true)}>
            <Plus />
            {t("workspace.create")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("workspace.createTitle")}</DialogTitle>
            <DialogDescription>{t("workspace.createBody")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field id="ws-name" label={t("workspace.name")} required>
              <Input
                id="ws-name"
                value={name}
                autoFocus
                placeholder={t("workspace.namePlaceholder")}
                onChange={event => setName(event.target.value)}
                onKeyDown={event => {
                  if (event.key === "Enter") void handleCreate();
                }}
              />
            </Field>
            <Field id="ws-currency" label={t("workspace.currency")}>
              <Select value={currency} onValueChange={value => setCurrency(value as PurchaseCurrency)}>
                <SelectTrigger id="ws-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PURCHASE_CURRENCIES.map(code => (
                    <SelectItem key={code} value={code}>
                      {t(`currency.${code}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreating(false)} disabled={busy}>
              {t("common.cancel")}
            </Button>
            <Button variant="primary" onClick={handleCreate} loading={busy} disabled={!name.trim()}>
              {t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
