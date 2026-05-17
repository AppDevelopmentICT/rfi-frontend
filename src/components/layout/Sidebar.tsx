"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ChevronsUpDown,
  CreditCard,
  Database,
  FileText,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/auth-context";
import { useSidebar } from "@/contexts/sidebar-context";
import { pb } from "@/lib/pocketbase";
import { cn } from "@/lib/utils";
import { logCustomEvent } from "@/services/dashboard.service";
import { getAvatarUrl } from "@/services/profile.service";

const mainNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Database, label: "Knowledge Base", href: "/knowledge-base" },
  { icon: FileText, label: "Documents", href: "/documents" },
];

const adminNavItems = [
  { icon: ShieldCheck, label: "Audit Log", href: "/admin/audit-log" },
  { icon: Users, label: "Users", href: "/admin/users" },
  { icon: Trash2, label: "Trash", href: "/admin/trash" },
];

function getInitials(name: string, email: string) {
  const value = name || email;
  return value
    .split(/\s+|@/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isSidebarOpen } = useSidebar();
  const { user, ready, signOut } = useAuth();

  useEffect(() => {
    if (isSidebarOpen) return;
    document.body.style.removeProperty("pointer-events");
  }, [isSidebarOpen]);

  const name = ready && user ? user.name || user.email || "shadcn" : "shadcn";
  const email = ready && user ? user.email || "m@example.com" : "m@example.com";
  const initials = getInitials(name, email);
  const isAdmin = !!user?.is_admin;

  const avatarSrc = getAvatarUrl(
    pb.authStore.record as Parameters<typeof getAvatarUrl>[0],
    100
  );

  const isActivePath = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const handleLogout = () => {
    void logCustomEvent("auth.logout", "user").finally(() => {
      signOut();
      pb.authStore.clear();
      window.location.href = "/login";
    });
  };

  return (
    <aside
      className={cn(
        "h-screen shrink-0 overflow-hidden border-r bg-sidebar transition-[width,border-color] duration-300 ease-in-out",
        isSidebarOpen ? "w-64 border-border/60" : "w-0 border-transparent"
      )}
      aria-hidden={!isSidebarOpen}
    >
      <div className="flex h-full w-64 flex-col">
        <div className="flex h-14 items-center gap-2.5 border-b border-border/50 px-5">
          <img
            src="/assets/ICT-Logo.png"
            alt="ICT Logo"
            className="size-8 object-contain"
          />
          <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
            RFI/RFP Platform
          </span>
        </div>

        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="flex flex-col gap-1">
            {mainNavItems.map((item) => {
              const active = isActivePath(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                      : "font-medium text-muted-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {isAdmin && (
            <div className="mt-8">
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Admin
              </p>
              <nav className="flex flex-col gap-1">
                {adminNavItems.map((item) => {
                  const active = isActivePath(item.href);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                        active
                          ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                          : "font-medium text-muted-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}
        </ScrollArea>

        <div className="mt-auto border-t border-border/50 p-3">
          {!ready || !user ? (
            <div className="flex items-center gap-3 rounded-xl p-2">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 flex flex-col gap-1">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="size-4 shrink-0" />
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-xl p-2 text-left outline-none transition-colors hover:bg-sidebar-accent focus-visible:bg-sidebar-accent">
                <Avatar>
                  <AvatarImage src={avatarSrc} alt={name} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 flex flex-col">
                  <p className="truncate text-sm font-semibold leading-snug text-sidebar-foreground">
                    {name}
                  </p>
                  <p className="truncate text-xs leading-snug text-muted-foreground">
                    {email}
                  </p>
                </div>
                <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
              </DropdownMenuTrigger>

              <DropdownMenuContent
                side="right"
                align="end"
                sideOffset={8}
                className="w-64 p-1.5"
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="p-2 font-normal">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={avatarSrc} alt={name} />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {email}
                        </p>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    className="gap-2 p-2"
                    onClick={() => router.push("/profile")}
                  >
                    <User className="size-4" />
                    Edit Profile
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  className="gap-2 p-2"
                  onClick={handleLogout}
                >
                  <LogOut className="size-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </aside>
  );
}
