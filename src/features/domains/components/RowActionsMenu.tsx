import {
  Archive,
  BadgeDollarSign,
  ExternalLink,
  FileText,
  MoreHorizontal,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DerivedDomain } from "@/lib/domain-rules";

export type RowActionHandlers = {
  onPurchaseDetails: () => void;
  onPricing: () => void;
  onNotes: () => void;
  onMarkSold: () => void;
  onArchive: () => void;
  onDelete: () => void;
};

/**
 * The ⋯ menu that sits in front of each domain name. Seven actions, in the
 * order requested: the editable records first, then the two lifecycle
 * shortcuts, then the link out and the destructive delete last.
 */
export function RowActionsMenu({
  domain,
  handlers,
}: {
  domain: DerivedDomain;
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
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem onSelect={() => handlers.onPurchaseDetails()}>
          <FileText />
          {t("domains.actions.purchaseDetails")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => handlers.onPricing()}>
          <Tag />
          {t("domains.actions.pricing")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => handlers.onNotes()}>
          <StickyNote />
          {t("domains.actions.notes")}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={() => handlers.onMarkSold()}>
          <BadgeDollarSign />
          {t("domains.actions.markSold")}
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
