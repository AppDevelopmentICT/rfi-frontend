"use client";

import { type ReactNode } from "react";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function MainLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto p-2">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
