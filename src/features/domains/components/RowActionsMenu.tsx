import {
  Archive,
  BadgeDollarSign,
  CircleSlash,
  ExternalLink,
  FileText,
  FolderInput,
  Link2,
  MoreHorizontal,
  RefreshCw,
  RotateCcw,
  StickyNote,
  Tag,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { folderColorClass } from "@/features/domains/folder-colors";
import type { DerivedDomain } from "@/lib/domain-rules";
import type { FolderRow } from "@/types/database";
import { cn } from "@/lib/utils";

export type RowActionHandlers = {
  onRefresh: () => void;
  onOpenDetail: () => void;
  onOpenUrlForwarding: () => void;
  onOpenNameservers: () => void;
  onRenew: () => void;
  onMarkSold: () => void;
  onAssignFolder: (folderId: string | null) => void;
  onNewFolder: () => void;
  onMarkDropped: () => void;
  onArchive: () => void;
  onDelete: () => void;
};

const NO_FOLDER = "__none__";

/**
 * The ⋯ menu. Order mirrors the DomBot reference: quick actions first, the
 * destructive pair last, with the folder submenu nested exactly as requested.
 */
export function RowActionsMenu({
  domain,
  folders,
  handlers,
}: {
  domain: DerivedDomain;
  folders: FolderRow[];
  handlers: RowActionHandlers;
}) {
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground"
          aria-label={t("common.actions")}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onSelect={() => handlers.onRefresh()}>
          <RefreshCw />
          {t("domains.actions.refresh")}
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <FolderInput />
            {t("domains.actions.folder")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-52">
            <DropdownMenuRadioGroup
              value={domain.folder_id ?? NO_FOLDER}
              onValueChange={value => handlers.onAssignFolder(value === NO_FOLDER ? null : value)}
            >
              <DropdownMenuRadioItem value={NO_FOLDER}>{t("domains.folder.none")}</DropdownMenuRadioItem>
              {folders.map(folder => (
                <DropdownMenuRadioItem key={folder.id} value={folder.id}>
                  <span className={cn("size-2 rounded-full", folderColorClass(folder.color).dot)} aria-hidden />
                  {folder.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => handlers.onNewFolder()}>
              {t("domains.folder.new")}
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuItem onSelect={() => handlers.onOpenUrlForwarding()}>
          <Link2 />
          {t("domains.actions.urlForwarding")}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={() => handlers.onRenew()}>
          <RotateCcw />
          {t("domains.actions.renew")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => handlers.onOpenDetail()}>
          <FileText />
          {t("domains.actions.purchaseDetails")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => handlers.onOpenDetail()}>
          <Tag />
          {t("domains.actions.pricing")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => handlers.onOpenNameservers()}>
          <FolderInput />
          {t("domains.actions.nameservers")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => handlers.onOpenDetail()}>
          <StickyNote />
          {t("domains.actions.notes")}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel>{t("domains.actions.markHeading")}</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => handlers.onMarkSold()}>
          <BadgeDollarSign />
          {t("domains.actions.markSold")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => handlers.onMarkDropped()}>
          <CircleSlash />
          {t("domains.actions.markDropped")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => handlers.onArchive()}>
          <Archive />
          {t("domains.actions.archive")}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onSelect={() => window.open(`https://${domain.domain}`, "_blank", "noopener,noreferrer")}
        >
          <ExternalLink />
          {t("domains.actions.openInBrowser")}
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={() => handlers.onDelete()}>
          <Trash2 />
          {t("domains.actions.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
