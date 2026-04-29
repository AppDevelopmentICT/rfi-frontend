"use client";

import { useState, type ReactNode } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function MainLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* 
         Desktop Dual-Pane Sidebar 
         We'll let Sidebar component handle the icons vs text split internally 
         to keep MainLayout clean.
      */}
      <aside className="hidden shrink-0 border-r lg:block">
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Mobile sidebar (Sheet overlay) */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-[300px] p-0">
          <SheetTitle className="sr-only">Navigation sidebar</SheetTitle>
          <Sidebar onClose={() => setSidebarOpen(false)} isMobile />
        </SheetContent>
      </Sheet>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header only, Desktop gets integrated breadcrumbs inside main */}
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto">
          <div className="w-full h-full p-2 bg-background">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
