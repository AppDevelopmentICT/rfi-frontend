"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, Search, X } from "lucide-react";
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
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-4 border-b border-border/40 bg-background/80 px-4 backdrop-blur-md">
      <Button variant="ghost" size="icon-sm" onClick={onMenuClick} className="lg:hidden">
        <Menu className="size-4" />
        <span className="sr-only">Toggle sidebar</span>
      </Button>

      <div className="flex flex-1 items-center justify-start">
        <form
          className="relative w-full max-w-md"
          onSubmit={(e) => {
            e.preventDefault();
            const q = searchQuery.trim();
            if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
          }}
        >
          <Search className="absolute left-3 top-1/2 mt-[-8px] size-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search RFI, RFP, or Documents..."
            className="w-full bg-background/50 pl-9 pr-9 md:w-[300px] lg:w-[400px]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 mt-[-8px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="size-4" />
              <span className="sr-only">Clear search</span>
            </button>
          )}
        </form>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Placeholder for future top-right actions */}
      </div>
    </header>
  );
}
