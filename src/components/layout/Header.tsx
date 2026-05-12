"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, Search, X, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleClear = () => {
    setSearchQuery("");
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-4 border-b border-border/50 bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Button variant="ghost" size="icon-sm" onClick={onMenuClick} className="lg:hidden">
        <Menu className="size-4" />
        <span className="sr-only">Toggle sidebar</span>
      </Button>

      <div className="flex flex-1 items-center justify-start">
        <form
          className="relative w-full max-w-sm"
          onSubmit={(e) => {
            e.preventDefault();
            const q = searchQuery.trim();
            if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
          }}
        >
          <Search className="absolute left-3 top-1/2 -mt-2 size-3.5 text-muted-foreground/60" />
          <Input
            type="text"
            placeholder="Search..."
            className="h-8 w-full rounded-lg border-border/60 bg-muted/40 pl-9 pr-9 text-sm transition-colors focus-visible:bg-background focus-visible:border-border"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 -mt-1.5 hidden h-5 select-none items-center gap-0.5 rounded border border-border/60 bg-muted/80 px-1.5 font-mono text-[10px] font-medium text-muted-foreground/60 sm:flex">
            <Command className="size-2.5" />K
          </kbd>
          {searchQuery && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-8 top-1/2 -mt-1.5 text-muted-foreground/60 hover:text-foreground transition-colors"
            >
              <X className="size-3" />
              <span className="sr-only">Clear</span>
            </button>
          )}
        </form>
      </div>

      <div className="ml-auto flex items-center gap-2">
      </div>
    </header>
  );
}
