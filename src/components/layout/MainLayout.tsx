"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function MainLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden w-[280px] shrink-0 border-r lg:block">
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Mobile sidebar (Sheet overlay) */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-[280px] p-0">
          <SheetTitle className="sr-only">Navigation sidebar</SheetTitle>
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        {/* Desktop header bar */}
        <div className="hidden items-center gap-2 border-b px-6 py-3 lg:flex">
          <Link href="/" className="flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            <span className="text-sm font-semibold">RFI / RFP Automation</span>
          </Link>
        </div>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
