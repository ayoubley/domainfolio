import {
  BarChart3,
  CalendarX2,
  Clock,
  FolderArchive,
  Import,
  LayoutDashboard,
  Repeat,
  Settings,
  Tag,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  shortcut?: string;
};

/**
 * The sidebar: the owner's destinations, stacked in this order and nothing
 * else. Everything a domain is deleted from the list goes to the archive, so it
 * sits right under the expired ones.
 */
export const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard, shortcut: "d" },
  { to: "/domains", labelKey: "nav.domains", icon: Tag, shortcut: "o" },
  { to: "/renewals", labelKey: "nav.renewals", icon: Repeat, shortcut: "r" },
  { to: "/sales", labelKey: "nav.sales", icon: TrendingUp, shortcut: "s" },
  { to: "/expired", labelKey: "nav.expired", icon: CalendarX2, shortcut: "e" },
  { to: "/archive", labelKey: "nav.archive", icon: FolderArchive },
];

/**
 * Routable pages that are deliberately kept out of the sidebar. They stay
 * reachable from the command palette, so no surface loses its home.
 */
export const SECONDARY_NAV_ITEMS: NavItem[] = [
  { to: "/analytics", labelKey: "nav.analytics", icon: BarChart3 },
  { to: "/activity", labelKey: "nav.activity", icon: Clock },
  { to: "/import", labelKey: "nav.import", icon: Import },
  { to: "/settings", labelKey: "nav.settings", icon: Settings },
];

/** Every page in the app, for the command palette. */
export const ALL_NAV_ITEMS: NavItem[] = [...NAV_ITEMS, ...SECONDARY_NAV_ITEMS];
