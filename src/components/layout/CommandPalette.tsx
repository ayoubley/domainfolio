import {
  Download,
  LayoutDashboard,
  Languages,
  LogOut,
  Plus,
  Sparkles,
  SunMoon,
  Tag,
} from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { ALL_NAV_ITEMS } from "@/components/layout/nav-items";
import { useAuth } from "@/features/auth/AuthProvider";
import { useLanguage } from "@/hooks/useLanguage";
import { useTheme } from "@/hooks/useTheme";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate } from "@/lib/format";
import type { DerivedDomain } from "@/lib/domain-rules";
import { shortcut } from "@/lib/platform";

export function CommandPalette({
  open,
  onOpenChange,
  domains,
  onNewDomain,
  onExport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domains: DerivedDomain[];
  onNewDomain: () => void;
  onExport: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toggleTheme } = useTheme();
  const { toggleLanguage } = useLanguage();
  const { signOut } = useAuth();

  const searchable = useMemo(
    () => domains.slice(0, 400).sort((a, b) => a.domain.localeCompare(b.domain)),
    [domains]
  );

  function run(action: () => void) {
    onOpenChange(false);
    // Let the dialog close before navigating so focus returns cleanly.
    window.setTimeout(action, 0);
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} label={t("command.placeholder")}>
      <CommandInput placeholder={t("command.placeholder")} />
      <CommandList>
        <CommandEmpty>{t("command.empty")}</CommandEmpty>

        <CommandGroup heading={t("command.groups.pages")}>
          {ALL_NAV_ITEMS.map(item => (
            <CommandItem key={item.to} value={`page ${t(item.labelKey)}`} onSelect={() => run(() => navigate(item.to))}>
              <item.icon />
              <span>{t(item.labelKey)}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t("command.groups.actions")}>
          <CommandItem value={`action ${t("command.action.newDomain")}`} onSelect={() => run(onNewDomain)}>
            <Plus />
            <span>{t("command.action.newDomain")}</span>
            <CommandShortcut>N</CommandShortcut>
          </CommandItem>
          <CommandItem value={`action ${t("command.action.exportView")}`} onSelect={() => run(onExport)}>
            <Download />
            <span>{t("command.action.exportView")}</span>
          </CommandItem>
          <CommandItem value={`action ${t("command.action.toggleTheme")}`} onSelect={() => run(toggleTheme)}>
            <SunMoon />
            <span>{t("command.action.toggleTheme")}</span>
          </CommandItem>
          <CommandItem value={`action ${t("command.action.toggleLanguage")}`} onSelect={() => run(() => void toggleLanguage())}>
            <Languages />
            <span>{t("command.action.toggleLanguage")}</span>
          </CommandItem>
          <CommandItem value={`action ${t("command.action.gotoDashboard")}`} onSelect={() => run(() => navigate("/dashboard"))}>
            <LayoutDashboard />
            <span>{t("command.action.gotoDashboard")}</span>
            <CommandShortcut>{shortcut("K")}</CommandShortcut>
          </CommandItem>
          <CommandItem
            value={`action ${t("command.action.signOut")}`}
            onSelect={() =>
              run(async () => {
                await signOut();
                toast.success(t("auth.signOutSuccess"));
                navigate("/auth/login");
              })
            }
          >
            <LogOut />
            <span>{t("command.action.signOut")}</span>
          </CommandItem>
        </CommandGroup>

        {searchable.length > 0 ? (
          <>
            <CommandSeparator />
            <CommandGroup heading={t("command.groups.domains")}>
              {searchable.map(domain => (
                <CommandItem
                  key={domain.id}
                  value={`domain ${domain.domain} ${domain.registrar ?? ""} ${(domain.tags ?? []).join(" ")}`}
                  onSelect={() => run(() => navigate(`/domains?focus=${encodeURIComponent(domain.id)}`))}
                >
                  <Sparkles className="opacity-0" />
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="truncate font-medium tabular">{domain.domain}</span>
                    {domain.expiry_date ? (
                      <span className="shrink-0 text-2xs text-muted-foreground">
                        {formatDate(domain.expiry_date)}
                      </span>
                    ) : null}
                  </span>
                  <StatusBadge status={domain.effectiveStatus} />
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}

        <CommandSeparator />
        <CommandGroup heading={t("command.groups.recent")}>
          <CommandItem value="recent domains list" onSelect={() => run(() => navigate("/domains"))}>
            <Tag />
            <span>{t("nav.domains")}</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
