"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Plus,
  ChevronDown,
  LogOut,
  Database,
  FileText,
  LayoutDashboard,
  ShieldCheck,
  Trash2,
  Users,
  FileSpreadsheet,
  FileSignature,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { logCustomEvent } from "@/services/dashboard.service";
import { getRfiDocument } from "@/services/rfi.service";
import { useRFIStore } from "@/store/useRFIStore";
import { useExcelStore } from "@/store/useExcelStore";
import { useEffect } from "react";
import { toast } from "sonner";

interface SidebarProps {
  onClose: () => void;
  isMobile?: boolean;
}

const mainNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Database, label: "Knowledge Base", href: "/knowledge-base" },
  { icon: FileText, label: "Documents", href: "/documents" },
];

const adminNavItems = [
  { icon: ShieldCheck, label: "Audit Log", href: "/admin/audit-log" },
  { icon: Users, label: "Users", href: "/admin/users" },
  { icon: Trash2, label: "Trash & Recover", href: "/admin/trash" },
];

export function Sidebar({ onClose, isMobile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, ready, signOut } = useAuth();
  const activeJobs = useRFIStore((s) => s.activeJobs);
  const updateJob = useRFIStore((s) => s.updateJob);
  const removeJob = useRFIStore((s) => s.removeJob);

  useEffect(() => {
    const active = activeJobs.filter((j) => j.status === "generating");
    if (active.length === 0) return;

    const interval = setInterval(async () => {
      for (const job of active) {
        try {
          const doc = await getRfiDocument(job.id);
          if (doc.status === "completed") {
            updateJob(job.id, "completed");
            if (doc.excelData) {
              useExcelStore.getState().setExcelData(doc.excelData);
            }
            toast.success(`RFI Generation completed: ${job.filename}`);
          } else if (doc.status === "failed") {
            updateJob(job.id, "failed");
            toast.error(`RFI Generation failed: ${job.filename}`);
          }
        } catch {}
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [activeJobs, updateJob]);

  const isAdmin = !!user?.is_admin;

  const initials = user?.name
    ? user.name
        .split(/\s+/)
        .filter(Boolean)
        .map((n: string) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : user?.email?.[0]?.toUpperCase();

  const isActivePath = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="flex h-full w-64 flex-col border-r border-gray-200/60 bg-sidebar">
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/ICT-Logo.png"
          alt="ICT Logo"
          className="size-8 object-contain"
        />
        <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
          RFI/RFP Platform
        </span>
      </div>

      <div className="px-4 pt-5 pb-2">
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 h-9 text-sm font-medium text-primary-foreground transition-all duration-200 hover:bg-primary/90 hover:shadow-md active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 outline-none select-none">
            <Plus className="size-4" strokeWidth={2.5} />
            <span>Create New</span>
            <ChevronDown className="ml-auto size-3.5 opacity-50" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            alignOffset={4}
            className="w-[232px] rounded-xl border border-gray-200/80 bg-white p-1.5 shadow-xl shadow-black/[0.08]"
          >
            <DropdownMenuItem
              className="gap-3 rounded-lg px-3 py-2.5 cursor-pointer transition-colors duration-150 hover:bg-gray-50 focus:bg-gray-50"
              onClick={() => router.push("/rfi/upload")}
            >
              <FileSpreadsheet className="size-4 shrink-0 text-slate-500" />
              <div>
                <p className="text-[13px] font-semibold text-slate-800">
                  New RFI
                </p>
                <p className="text-[11px] leading-snug text-slate-400">
                  Upload Excel
                </p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-3 rounded-lg px-3 py-2.5 cursor-pointer transition-colors duration-150 hover:bg-gray-50 focus:bg-gray-50"
              onClick={() => router.push("/rfp/upload")}
            >
              <FileSignature className="size-4 shrink-0 text-slate-500" />
              <div>
                <p className="text-[13px] font-semibold text-slate-800">
                  New RFP
                </p>
                <p className="text-[11px] leading-snug text-slate-400">
                  Generate Ch.3
                </p>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ScrollArea className="flex-1 px-3 py-3">
        <nav className="flex flex-col gap-0.5">
          {mainNavItems.map((item) => {
            const active = isActivePath(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={isMobile ? onClose : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors",
                  active
                    ? "bg-muted font-semibold text-foreground"
                    : "font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <item.icon className="size-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {isAdmin && (
          <div className="mt-6">
            <p className="text-xs font-semibold text-muted-foreground tracking-wider px-3 mb-2">
              Admin
            </p>
            <nav className="flex flex-col gap-0.5">
              {adminNavItems.map((item) => {
                const active = isActivePath(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={isMobile ? onClose : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors",
                      active
                        ? "bg-muted font-semibold text-foreground"
                        : "font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    <item.icon className="size-5 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}

        {activeJobs.length > 0 && (
          <div className="mt-5">
            <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground tracking-wider">
              Active
            </p>
            <div className="flex flex-col gap-1">
              {activeJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-colors hover:bg-muted/60 cursor-pointer"
                  onClick={() => {
                    if (job.status !== "failed") {
                      useRFIStore.setState({ fileName: job.filename });
                      router.push(`/rfi/${job.id}`);
                    }
                  }}
                >
                  {job.status === "generating" ? (
                    <Loader2 className="size-3.5 animate-spin text-primary shrink-0" />
                  ) : job.status === "completed" ? (
                    <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertCircle className="size-3.5 text-destructive shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-foreground/90">
                      {job.filename}
                    </p>
                    <p className="text-[10px] truncate capitalize text-muted-foreground">
                      {job.status}
                    </p>
                  </div>
                  {job.status !== "generating" && (
                    <button
                      type="button"
                      className="flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeJob(job.id);
                      }}
                    >
                      <span className="sr-only">Dismiss</span>
                      &times;
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </ScrollArea>

      {ready && user && (
        <div className="mt-auto border-t border-border/40 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary ring-1 ring-primary/20">
              {initials}
            </div>
            <div className="flex-1 overflow-hidden min-w-0">
              <p className="truncate text-sm font-medium text-foreground leading-none">
                {user.name || user.email}
              </p>
              <p className="mt-1 truncate text-[11px] text-muted-foreground leading-none">
                {user.email}
              </p>
            </div>
            <button
              type="button"
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              onClick={async () => {
                try {
                  await logCustomEvent("auth.logout", "user");
                } catch {}
                signOut();
                window.location.href = "/login";
              }}
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
