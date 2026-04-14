"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { NAV_ITEMS } from "@/config/navigation";
import { cn } from "@/lib/utils";

interface SidebarProps {
  onClose: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight">Navigation</h2>
        <Button
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          onClick={onClose}
        >
          <ChevronLeft className="size-4" />
          <span className="sr-only">Close sidebar</span>
        </Button>
      </div>

      <div className="px-3 pb-2">
        <Link href="/upload-rfp">
          <Button variant="outline" className="w-full justify-start gap-2">
            <Plus className="size-4" />
            New RFP
          </Button>
        </Link>
      </div>

      <Separator />

      <ScrollArea className="flex-1 px-3 py-2">
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                <item.icon className="size-4" />
                {item.title}
              </Link>
            );
          })}
        </nav>

        <Separator className="my-2" />

        <div className="flex flex-col gap-1">
          <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
            Recent
          </p>
          <p className="px-2 py-1 text-sm text-muted-foreground">
            No history yet
          </p>
        </div>
      </ScrollArea>
    </div>
  );
}
