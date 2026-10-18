import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { sequence, shortcut } from "@/lib/platform";

type Shortcut = { keys: string[]; labelKey: string };

const GROUPS: { id: string; labelKey: string; items: Shortcut[] }[] = [
  {
    id: "general",
    labelKey: "shortcuts.group.general",
    items: [
      { keys: [shortcut("K")], labelKey: "shortcuts.openPalette" },
      { keys: ["/"], labelKey: "shortcuts.search" },
      { keys: ["?"], labelKey: "shortcuts.shortcuts" },
      { keys: ["Esc"], labelKey: "shortcuts.closeDialog" },
    ],
  },
  {
    id: "navigation",
    labelKey: "shortcuts.group.navigation",
    items: [
      { keys: [sequence("G", "D")], labelKey: "shortcuts.goDashboard" },
      { keys: [sequence("G", "O")], labelKey: "shortcuts.goDomains" },
      { keys: [sequence("G", "R")], labelKey: "shortcuts.goRenewals" },
      { keys: [sequence("G", "S")], labelKey: "shortcuts.goSales" },
      { keys: [sequence("G", "E")], labelKey: "shortcuts.goExpired" },
      { keys: [sequence("G", ",")], labelKey: "shortcuts.goSettings" },
    ],
  },
  {
    id: "actions",
    labelKey: "shortcuts.group.actions",
    items: [{ keys: ["N"], labelKey: "shortcuts.newDomain" }],
  },
];

export function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("shortcuts.title")}</DialogTitle>
          <DialogDescription>{t("shortcuts.subtitle")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {GROUPS.map((group, index) => (
            <div key={group.id} className="space-y-2">
              {index > 0 ? <Separator className="mb-3" /> : null}
              <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t(group.labelKey)}
              </p>
              <ul className="space-y-1">
                {group.items.map(item => (
                  <li key={item.labelKey} className="flex items-center justify-between gap-4 rounded-md px-1 py-1.5">
                    <span className="text-2sm text-muted-foreground">{t(item.labelKey)}</span>
                    <span className="flex items-center gap-1">
                      {item.keys.map(key => (
                        <kbd
                          key={key}
                          className="min-w-6 rounded border border-border bg-muted px-1.5 py-0.5 text-center font-sans text-2xs font-medium text-muted-foreground"
                        >
                          {key}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
