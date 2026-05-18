"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Command as CommandPrimitive } from "cmdk";
import {
  BookOpen,
  Database,
  FilePlus2,
  FileSearch,
  FileSignature,
  FileSpreadsheet,
  History,
  Menu,
  Plus,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { useSidebar } from "@/contexts/sidebar-context";
import { cn } from "@/lib/utils";

type PaletteItem = {
  label: string;
  description: string;
  href: string;
  group: "Documents" | "RFP Chapters" | "Quick Actions";
  icon: typeof Search;
  keywords: string[];
};

const paletteItems: PaletteItem[] = [
  { label: "Search All Documents", description: "Open global search across RFI, RFP, and Knowledge Base", href: "/search", group: "Documents", icon: FileSearch, keywords: ["search", "document", "global", "rfp", "rfi"] },
  { label: "Knowledge Base", description: "Find uploaded files and indexed references", href: "/knowledge-base", group: "Documents", icon: Database, keywords: ["knowledge", "kb", "documents", "source"] },
  { label: "Documents", description: "Browse generated RFI and RFP workspaces", href: "/documents", group: "Documents", icon: BookOpen, keywords: ["files", "rfp", "rfi", "workspace"] },
  { label: "RFP Chapter 3", description: "Open saved technical proposal chapters", href: "/documents/search?type=rfp", group: "RFP Chapters", icon: FileSignature, keywords: ["rfp", "chapter", "bab", "technical", "proposal"] },
  { label: "Create New RFI (Excel)", description: "Upload Excel workbook and generate answers", href: "/rfi/upload", group: "Quick Actions", icon: FileSpreadsheet, keywords: ["create", "new", "rfi", "excel", "upload"] },
  { label: "Create New RFI (PDF)", description: "Upload PDF folder with auto-draft workflow", href: "/rfi-pdf/upload", group: "Quick Actions", icon: FilePlus2, keywords: ["create", "new", "rfi", "pdf", "upload"] },
  { label: "Create New RFP", description: "Generate RFP technical Chapter 3 response", href: "/rfp/upload", group: "Quick Actions", icon: Plus, keywords: ["create", "new", "rfp", "chapter"] },
  { label: "Audit Log", description: "Review platform activity and security events", href: "/admin/audit-log", group: "Quick Actions", icon: ShieldCheck, keywords: ["audit", "log", "admin", "history"] },
  { label: "Trash & Recover", description: "Restore deleted resources", href: "/admin/trash", group: "Quick Actions", icon: History, keywords: ["trash", "recover", "restore", "admin"] },
];

function isMacOS() {
  if (typeof navigator === "undefined") return false;
  const platform = navigator.platform.toLowerCase();
  const userAgent = navigator.userAgent.toLowerCase();
  return platform.includes("mac") || userAgent.includes("mac os");
}

export function Header() {
  const router = useRouter();
  const { toggleSidebar } = useSidebar();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isMac] = useState(isMacOS);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key?.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const shortcutLabel = isMac ? "⌘" : "Ctrl";
  const isAdmin = !!user?.is_admin;
  const visiblePaletteItems = useMemo(
    () =>
      paletteItems.filter(
        (item) => isAdmin || !item.href.startsWith("/admin"),
      ),
    [isAdmin],
  );
  const groups = useMemo(() => ["Documents", "RFP Chapters", "Quick Actions"] as const, []);

  const runCommand = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  const runSearch = () => {
    const value = query.trim();
    if (!value) return;
    runCommand(`/search?q=${encodeURIComponent(value)}`);
  };

  return (
    <>
      <header className="sticky top-0 z-30 grid h-14 shrink-0 grid-cols-[auto_1fr_auto] items-center border-b border-border/50 bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          <Menu className="size-5" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>

        <div className="absolute left-1/2 w-[min(520px,calc(100%-7rem))] -translate-x-1/2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(
              "group relative flex h-9 w-full items-center rounded-full border border-border/60 bg-muted/40 pl-9 pr-2 text-left text-sm text-muted-foreground shadow-sm transition-all duration-200",
              "hover:border-primary/50 hover:bg-background hover:text-foreground hover:shadow-md",
              "focus-visible:border-primary focus-visible:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-2",
            )}
          >
            <Search className="absolute left-3 top-1/2 -mt-2 size-4 text-muted-foreground/70 transition-colors group-hover:text-primary" />
            <span className="truncate">Search documents, RFP chapters, or actions...</span>
            <span className="ml-auto hidden items-center gap-1 rounded-md border border-border/70 bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground shadow-sm sm:flex">
              <span>{shortcutLabel}</span>
              <span>K</span>
            </span>
          </button>
        </div>

        <div className="flex items-center justify-end gap-2" />
      </header>

      <div
        className={cn(
          "fixed inset-0 z-50 flex items-start justify-center bg-black/35 px-4 pt-[14vh] backdrop-blur-sm transition-all duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
      >
        <CommandPrimitive
          shouldFilter
          className={cn(
            "w-full max-w-2xl overflow-hidden rounded-2xl border border-border/80 bg-popover text-popover-foreground shadow-2xl shadow-black/20 transition-all duration-200",
            open ? "translate-y-0 scale-100 opacity-100" : "-translate-y-3 scale-[0.98] opacity-0",
          )}
        >
          <div className="flex items-center border-b px-4">
            <Search className="mr-3 size-4 text-muted-foreground" />
            <CommandPrimitive.Input
              value={query}
              onValueChange={setQuery}
              onKeyDown={(event) => {
                if (event.key === "Enter" && query.trim()) runSearch();
                if (event.key === "Escape") setOpen(false);
              }}
              autoFocus
              placeholder="Cari dokumen, bab RFP, atau aksi cepat..."
              className="h-13 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden items-center gap-1 rounded-md border border-border/70 bg-muted px-2 py-1 font-mono text-[10px] font-medium text-muted-foreground shadow-sm sm:flex">Esc</kbd>
          </div>

          <CommandPrimitive.List className="max-h-[420px] overflow-y-auto p-2">
            {query.trim() && (
              <CommandPrimitive.Item
                value={`search ${query}`}
                onSelect={runSearch}
                className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm outline-none transition-colors aria-selected:bg-muted"
              >
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Search className="size-4" />
                </div>
                <div>
                  <p className="font-medium">Search “{query.trim()}”</p>
                  <p className="text-xs text-muted-foreground">Cari di RFI, RFP, dan Knowledge Base</p>
                </div>
              </CommandPrimitive.Item>
            )}

            <CommandPrimitive.Empty className="py-10 text-center text-sm text-muted-foreground">No command found.</CommandPrimitive.Empty>

            {groups.map((group) => (
              <CommandPrimitive.Group
                key={group}
                heading={group}
                className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                {visiblePaletteItems
                  .filter((item) => item.group === group)
                  .map((item) => {
                    const Icon = item.icon;
                    return (
                      <CommandPrimitive.Item
                        key={item.href}
                        value={`${item.label} ${item.description} ${item.keywords.join(" ")}`}
                        onSelect={() => runCommand(item.href)}
                        className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm outline-none transition-colors aria-selected:bg-muted aria-selected:text-foreground"
                      >
                        <div className="flex size-8 items-center justify-center rounded-lg border bg-background text-muted-foreground">
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{item.label}</p>
                          <p className="truncate text-xs text-muted-foreground">{item.description}</p>
                        </div>
                      </CommandPrimitive.Item>
                    );
                  })}
              </CommandPrimitive.Group>
            ))}
          </CommandPrimitive.List>
        </CommandPrimitive>
      </div>
    </>
  );
}
