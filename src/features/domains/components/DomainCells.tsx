import { Check, Folder as FolderIcon, Lock, ShieldCheck, ShieldOff, Unlock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import type { LifecycleTone } from "@/lib/domain-rules";
import type { DomainSource, FolderRow } from "@/types/database";
import { folderColorClass } from "@/features/domains/folder-colors";
import { cn } from "@/lib/utils";

const NO_FOLDER = "__none__";

/** Registry lifecycle badge (Redemption / Expired / Grace / Hold). */
const LIFECYCLE_CLASS: Record<LifecycleTone, string> = {
  redemption: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  expired: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
  grace: "bg-pink-500/15 text-pink-700 dark:text-pink-300",
  hold: "bg-red-500/15 text-red-700 dark:text-red-300",
};

export function LifecycleBadge({ tone }: { tone: LifecycleTone }) {
  const { t } = useTranslation();
  return (
    <Badge className={cn("border-transparent", LIFECYCLE_CLASS[tone])}>{t(`lifecycle.${tone}`)}</Badge>
  );
}

/** "Imported" source badge — no connected account reports this name. */
export function SourceBadge({ source }: { source: DomainSource }) {
  const { t } = useTranslation();
  if (source !== "imported") return null;
  return (
    <Badge variant="outline" className="text-muted-foreground">
      {t("domains.source.imported")}
    </Badge>
  );
}

/** A folder chip that opens the assign-folder menu for its row. */
export function FolderCell({
  folder,
  folders,
  onAssign,
  onNewFolder,
  disabled,
}: {
  folder: FolderRow | null;
  folders: FolderRow[];
  onAssign: (folderId: string | null) => void;
  onNewFolder: () => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const color = folderColorClass(folder?.color);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          type="button"
          onClick={event => event.stopPropagation()}
          className={cn(
            "inline-flex max-w-full items-center gap-1.5 rounded-md px-1.5 py-0.5 text-2xs transition-colors",
            folder ? color.chip : "text-muted-foreground hover:bg-muted",
            disabled && "pointer-events-none opacity-50"
          )}
          title={folder ? folder.name : t("domains.folder.none")}
        >
          {folder ? (
            <span className={cn("size-2 shrink-0 rounded-full", color.dot)} aria-hidden />
          ) : (
            <FolderIcon className="size-3 shrink-0 opacity-60" aria-hidden />
          )}
          <span className="truncate">{folder ? folder.name : t("domains.folder.assign")}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuLabel>{t("domains.folder.move")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={folder?.id ?? NO_FOLDER}
          onValueChange={value => onAssign(value === NO_FOLDER ? null : value)}
        >
          <DropdownMenuRadioItem value={NO_FOLDER}>{t("domains.folder.none")}</DropdownMenuRadioItem>
          {folders.map(item => (
            <DropdownMenuRadioItem key={item.id} value={item.id}>
              <span className={cn("size-2 rounded-full", folderColorClass(item.color).dot)} aria-hidden />
              {item.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onNewFolder()}>{t("domains.folder.new")}</DropdownMenuItem>
        {folder ? (
          <DropdownMenuItem onSelect={() => onAssign(null)}>
            <Check />
            {t("domains.folder.clear")}
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Auto-renew toggle. Writes optimistically through the quick-update mutation. */
export function AutoRenewSwitch({
  checked,
  onCheckedChange,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <span className="flex justify-center">
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label="auto-renew"
      />
    </span>
  );
}

/** Privacy / Locked flag cell — a single clickable icon that toggles the flag. */
export function FlagToggle({
  on,
  label,
  onToggle,
  disabled,
  kind,
}: {
  on: boolean;
  label: string;
  onToggle: () => void;
  disabled?: boolean;
  kind: "privacy" | "locked";
}) {
  const Icon = kind === "privacy" ? (on ? ShieldCheck : ShieldOff) : on ? Lock : Unlock;
  return (
    <button
      type="button"
      onClick={event => {
        event.stopPropagation();
        onToggle();
      }}
      disabled={disabled}
      aria-pressed={on}
      aria-label={label}
      title={label}
      className={cn(
        "flex items-center justify-center rounded-md p-1 transition-colors",
        on ? "text-status-active" : "text-status-expiring",
        "hover:bg-muted",
        disabled && "pointer-events-none opacity-50"
      )}
    >
      <Icon className="size-4" aria-hidden />
    </button>
  );
}

/** Nameservers: first entry plus a "+N" overflow, opens the editor. */
export function NameserversCell({
  nameservers,
  onOpen,
}: {
  nameservers: string[];
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const [first, ...rest] = nameservers;

  if (!first) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <button
      type="button"
      onClick={event => {
        event.stopPropagation();
        onOpen();
      }}
      className="flex max-w-full items-center gap-1 text-2xs tabular text-muted-foreground transition-colors hover:text-foreground"
      title={nameservers.join(", ")}
      aria-label={t("domains.ns.title")}
    >
      <span className="truncate">{first}</span>
      {rest.length > 0 ? (
        <span className="shrink-0 rounded bg-muted px-1 text-2xs text-muted-foreground">+{rest.length}</span>
      ) : null}
    </button>
  );
}
