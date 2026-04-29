"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Plus,
  ChevronLeft,
  LogOut,
  Database,
  Files,
  Settings,
  LayoutDashboard,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";

interface SidebarProps {
  onClose: () => void;
  isMobile?: boolean;
}

export function Sidebar({ onClose, isMobile }: SidebarProps) {
  const pathname = usePathname();
  const { user, ready, signOut } = useAuth();

  const initials = user?.name
    ? user.name
        .split(/\s+/)
        .filter(Boolean)
        .map((n: string) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : user?.email?.[0]?.toUpperCase();

  const railItems = [
    { icon: LayoutDashboard, label: "Home", href: "/" },
    { icon: Database, label: "Knowledge Base", href: "/knowledge-base" },
    { icon: Files, label: "Documents", href: "/documents" },
  ];

  const bottomRailItems = [
    { icon: HelpCircle, label: "Support", href: "#" },
    { icon: Settings, label: "Settings", href: "#" },
  ];

  return (
    <div className="flex h-full">
      {!isMobile && (
        <div className="flex w-14 flex-col items-center border-r bg-sidebar py-4">
          <div className="flex flex-col gap-4">
            {railItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link key={item.label} href={item.href}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "size-9 transition-all hover:bg-accent",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    <item.icon className="size-5" />
                    <span className="sr-only">{item.label}</span>
                  </Button>
                </Link>
              );
            })}
          </div>

          <div className="mt-auto flex flex-col gap-4">
            {bottomRailItems.map((item) => (
              <Button
                key={item.label}
                variant="ghost"
                size="icon"
                className="size-9 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <item.icon className="size-5" />
                <span className="sr-only">{item.label}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      <div
        className={cn(
          "flex h-full flex-col bg-sidebar text-sidebar-foreground",
          isMobile ? "w-full" : "w-[240px]"
        )}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {(() => {
              if (pathname.includes("knowledge")) return "Knowledge Base";
              if (pathname.includes("documents")) return "Documents";
              if (pathname.includes("rfi")) return "RFI";
              if (pathname.includes("rfp")) return "RFP";
              return "Dashboard";
            })()}
          </h2>
          {isMobile && (
            <Button variant="ghost" size="icon-sm" onClick={onClose}>
              <ChevronLeft className="size-4" />
            </Button>
          )}
        </div>

        <div className="px-3 pb-4 flex flex-col gap-2">
          <Link href="/rfi/upload">
            <Button
              variant="outline"
              className="w-full justify-start gap-2 border-dashed bg-transparent hover:bg-accent"
            >
              <Plus className="size-4 text-primary" />
              <span className="text-sm">New RFI</span>
            </Button>
          </Link>
          <Link href="/rfp/upload">
            <Button
              variant="outline"
              className="w-full justify-start gap-2 border-dashed bg-transparent hover:bg-accent"
            >
              <Plus className="size-4 text-primary" />
              <span className="text-sm">New RFP</span>
            </Button>
          </Link>
        </div>

        <Separator className="bg-border/50 mx-3 w-auto" />

        <ScrollArea className="flex-1 px-3 py-4">
          <div className="mt-8 flex flex-col gap-1">
            <p className="px-2 pb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">
              History
            </p>
            <p className="px-2 py-1 text-xs text-muted-foreground/60 italic">
              No recent activity
            </p>
          </div>
        </ScrollArea>

        {ready && user && (
          <div className="mt-auto border-t bg-sidebar-accent/30 p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary ring-1 ring-primary/20">
                {initials}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-semibold text-foreground leading-none">
                  {user.name || user.email}
                </p>
                <p className="mt-1 truncate text-[11px] text-muted-foreground">
                  {user.email}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  signOut();
                  window.location.href = "/login";
                }}
                className="hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
