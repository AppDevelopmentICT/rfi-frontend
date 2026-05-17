"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { UserPill } from "@/components/shared/UserPill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UnauthorizedPage } from "@/components/shared/UnauthorizedPage";
import { listAdminUsers, setUserAdmin } from "@/services/admin.service";
import type { RFIUser } from "@/services/rfi.service";
import { useAuth } from "@/contexts/auth-context";
import { useFetchOnNavigation } from "@/hooks/useFetchOnNavigation";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export default function AdminUsersPage() {
  const { user } = useAuth();
  const isAdmin = !!user?.is_admin;
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedQ(q);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [q]);

  const params = useMemo(() => {
    const is_admin =
      roleFilter === "admin" ? true : roleFilter === "user" ? false : undefined;
    return {
      q: debouncedQ.trim() || undefined,
      is_admin,
      page,
      page_size: pageSize,
    };
  }, [debouncedQ, roleFilter, page, pageSize]);

  const fetchKey = `admin-users-${JSON.stringify(params)}`;

  const { data, isLoading, refetch } = useFetchOnNavigation(
    fetchKey,
    () => listAdminUsers(params)
  );

  const users = data?.items ?? [];
  const total = data?.total ?? 0;

  const toggleAdmin = async (user: RFIUser) => {
    try {
      setUpdatingId(user.id);
      await setUserAdmin(user.id, !user.is_admin);
      toast.success("User role updated.");
      refetch();
    } catch {
      toast.error("Failed to update user role.");
    } finally {
      setUpdatingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  if (!isAdmin) {
    return <UnauthorizedPage resource="the user management page" />;
  }

  return (
    <div className="flex-1 space-y-6 px-6 py-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage who has access to the admin audit log and user controls.
        </p>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="flex-row items-center justify-between space-y-0 border-b py-3 px-4">
          <CardTitle className="text-base font-semibold">All Users</CardTitle>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name or email…"
                className="h-8 w-[220px] pl-8 text-sm"
              />
            </div>
            {/* Role filter */}
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="h-8 rounded-lg border bg-background px-3 text-sm"
            >
              <option value="">All roles</option>
              <option value="admin">Admins only</option>
              <option value="user">Users only</option>
            </select>
            {/* Page size */}
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="h-8 rounded-lg border bg-background px-3 text-sm"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-5 w-1/4" />
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <UserPill name={user.name} email={user.email} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_admin ? "default" : "outline"}>
                        {user.is_admin ? "Admin" : "User"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant={user.is_admin ? "destructive" : "outline"}
                        size="sm"
                        disabled={updatingId === user.id}
                        onClick={() => toggleAdmin(user)}
                      >
                        {user.is_admin ? "Remove Admin" : "Make Admin"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination footer */}
          {!isLoading && total > 0 && (
            <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
              <span>
                Showing {startItem}–{endItem} of {total} user{total !== 1 ? "s" : ""}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={page <= 1}
                  onClick={() => setPage(1)}
                  title="First page"
                >
                  <ChevronsLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  title="Previous page"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="px-3 font-medium tabular-nums">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  title="Next page"
                >
                  <ChevronRight className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(totalPages)}
                  title="Last page"
                >
                  <ChevronsRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
