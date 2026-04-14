"use client";

import Link from "next/link";
import { Menu, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="flex h-14 items-center gap-3 border-b bg-background px-4 lg:hidden">
      <Button variant="ghost" size="icon-sm" onClick={onMenuClick}>
        <Menu className="size-4" />
        <span className="sr-only">Toggle sidebar</span>
      </Button>
      <Link href="/" className="flex items-center gap-2">
        <FileText className="size-5 text-primary" />
        <span className="text-sm font-semibold">RFI / RFP Automation</span>
      </Link>
    </header>
  );
}
