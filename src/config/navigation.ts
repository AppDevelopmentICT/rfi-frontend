import { Database, FileUp, History, type LucideIcon } from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  {
    title: "History",
    href: "/",
    icon: History,
  },
  {
    title: "Knowledge Base",
    href: "/knowledge-base",
    icon: Database,
  },
  {
    title: "Upload RFP",
    href: "/upload-rfp",
    icon: FileUp,
  },
];
