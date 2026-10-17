import {
  BarChart3,
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

export type NavSection = {
  id: string;
  labelKey: string;
  items: NavItem[];
};

/** The app's information architecture, in one place. */
export const NAV_SECTIONS: NavSection[] = [
  {
    id: "portfolio",
    labelKey: "nav.section.portfolio",
    items: [
      { to: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard, shortcut: "d" },
      { to: "/domains", labelKey: "nav.domains", icon: Tag, shortcut: "o" },
    ],
  },
  {
    id: "operations",
    labelKey: "nav.section.operations",
    items: [
      { to: "/renewals", labelKey: "nav.renewals", icon: Repeat, shortcut: "r" },
      { to: "/sales", labelKey: "nav.sales", icon: TrendingUp, shortcut: "s" },
      { to: "/import", labelKey: "nav.import", icon: Import },
    ],
  },
  {
    id: "insights",
    labelKey: "nav.section.insights",
    items: [
      { to: "/analytics", labelKey: "nav.analytics", icon: BarChart3 },
      { to: "/activity", labelKey: "nav.activity", icon: Clock },
      { to: "/archive", labelKey: "nav.archive", icon: FolderArchive },
    ],
  },
  {
    id: "workspace",
    labelKey: "nav.section.workspace",
    items: [{ to: "/settings", labelKey: "nav.settings", icon: Settings }],
  },
];

export const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap(section => section.items);
