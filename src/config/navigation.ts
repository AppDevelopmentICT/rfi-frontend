import { Database, type LucideIcon } from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  {
    title: "Knowledge Base",
    href: "/knowledge-base",
    icon: Database,
  },
  // {
  //   title: "Document Library",
  //   href: "/documents",
  //   icon: Folders,
  // },
  // {
  //   title: "Activity History",
  //   href: "/",
  //   icon: Clock,
  // },
];
