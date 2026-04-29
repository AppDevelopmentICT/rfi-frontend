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
  ShieldCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { logCustomEvent, getDashboardHistory, AuditLogEntry } from "@/services/dashboard.service";
import { getRfiDocument } from "@/services/rfi.service";
import { useRFIStore } from "@/store/useRFIStore";
import { useExcelStore } from "@/store/useExcelStore";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Loader2, CheckCircle2, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useRouter } from "next/navigation";

interface SidebarProps {
  onClose: () => void;
  isMobile?: boolean;
}

export function Sidebar({ onClose, isMobile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, ready, signOut } = useAuth();
  const [history, setHistory] = useState<AuditLogEntry[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const activeJobs = useRFIStore(s => s.activeJobs);
  const updateJob = useRFIStore(s => s.updateJob);
  const removeJob = useRFIStore(s => s.removeJob);

  useEffect(() => {
    getDashboardHistory(5).then(setHistory).catch(() => {});
  }, []);

  useEffect(() => {
    const active = activeJobs.filter(j => j.status === "generating");
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
            getDashboardHistory(5).then(setHistory).catch(() => {});
          } else if (doc.status === "failed") {
            updateJob(job.id, "failed");
            toast.error(`RFI Generation failed: ${job.filename}`);
          }
        } catch {
          // ignore transient errors
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [activeJobs, updateJob]);

  const initials = user?.name
    ? user.name
        .split(/\s+/)
        .filter(Boolean)
        .map((n: string) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : user?.email?.[0]?.toUpperCase();

  const isAdmin = !!user?.is_admin;

  const railItems = [
    { icon: LayoutDashboard, label: "Home", href: "/" },
    { icon: Database, label: "Knowledge Base", href: "/knowledge-base" },
    { icon: Files, label: "Documents", href: "/documents" },
    ...(isAdmin ? [{ icon: ShieldCheck, label: "Audit Log", href: "/admin/audit-log" }] : []),
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
          {isAdmin && (
            <div className="mb-6 flex flex-col gap-1">
              <p className="px-2 pb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">
                Admin
              </p>
              <Link
                href="/admin/audit-log"
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent",
                  pathname.startsWith("/admin/audit-log")
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground"
                )}
              >
                <ShieldCheck className="size-4" />
                Audit Log
              </Link>
              <Link
                href="/admin/users"
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent",
                  pathname.startsWith("/admin/users")
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground"
                )}
              >
                <Users className="size-4" />
                Users
              </Link>
            </div>
          )}

          {activeJobs.length > 0 && (
            <div className="flex flex-col gap-1 mb-6">
              <p className="px-2 pb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">
                Background Tasks
              </p>
              <div className="flex flex-col gap-2">
                {activeJobs.map(job => (
                  <div 
                    key={job.id} 
                    className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground/80 hover:bg-accent hover:text-foreground cursor-pointer rounded-md transition-colors"
                    onClick={() => {
                      if (job.status !== "failed") {
                        useRFIStore.setState({ fileName: job.filename });
                        router.push(`/rfi/${job.id}`);
                      }
                    }}
                  >
                    {job.status === "generating" ? <Loader2 className="size-3 animate-spin text-primary" /> : job.status === "completed" ? <CheckCircle2 className="size-3 text-green-500" /> : <AlertCircle className="size-3 text-destructive" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{job.filename}</p>
                      <p className="text-[10px] truncate capitalize">{job.status}</p>
                    </div>
                    {job.status !== "generating" && (
                      <Button 
                        variant="ghost" 
                        size="icon-sm" 
                        className="size-5 shrink-0" 
                        onClick={(e) => {
                          e.stopPropagation();
                          removeJob(job.id);
                        }}
                      >
                        <span className="sr-only">Dismiss</span>
                        &times;
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </ScrollArea>

        <Collapsible open={isHistoryOpen} onOpenChange={setIsHistoryOpen} className="border-t bg-sidebar-accent/10">
          <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 hover:bg-accent transition-colors cursor-pointer">
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">History</span>
            {isHistoryOpen ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="px-3 pb-4">
            {history.length === 0 ? (
              <p className="px-2 py-1 text-xs text-muted-foreground/60 italic">
                No recent activity
              </p>
            ) : (
              <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto pr-1">
                {history.map(log => (
                  <div key={log.id} className="px-2 py-1 text-xs text-muted-foreground/80 hover:text-foreground">
                    <p className="font-medium truncate">{log.action.replace("rfi.", "RFI ").toUpperCase()}</p>
                    <p className="text-[10px] truncate">{log.details?.filename || log.resource_type}</p>
                    <p className="text-[9px] opacity-70 mt-0.5">{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</p>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

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
                onClick={async () => {
                  try {
                    await logCustomEvent("auth.logout", "user");
                  } catch {}
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
