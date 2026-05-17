"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Search,
  X,
} from "lucide-react";

import { UnauthorizedPage } from "@/components/shared/UnauthorizedPage";
import { ExactTime } from "@/components/shared/RelativeTime";
import { UserPill } from "@/components/shared/UserPill";
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
import { useFetchOnNavigation } from "@/hooks/useFetchOnNavigation";
import {
  listAdminUsers,
  listAuditFilterOptions,
  listAuditLogs,
  type AuditFilterOptions,
} from "@/services/admin.service";
import type { RFIUser } from "@/services/rfi.service";
import { formatAuditActionTitle, formatAuditResourceType } from "@/lib/audit-labels";
import { useAuth } from "@/contexts/auth-context";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export default function AdminAuditLogPage() {
  const { user } = useAuth();
  const isAdmin = !!user?.is_admin;
  const [allUsers, setAllUsers] = useState<RFIUser[]>([]);
  const [options, setOptions] = useState<AuditFilterOptions>({
    actions: [],
    resource_types: [],
  });
  const [userId, setUserId] = useState("");
  const [action, setAction] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [detailOpen, setDetailOpen] = useState<number | null>(null);

  const closeDetail = useCallback(() => setDetailOpen(null), []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedQ(q);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [q]);

  const params = useMemo(
    () => ({
      user_id: userId ? Number(userId) : undefined,
      action: action || undefined,
      resource_type: resourceType || undefined,
      date_from: dateFrom ? new Date(dateFrom).toISOString() : undefined,
      date_to: dateTo ? new Date(dateTo).toISOString() : undefined,
      q: debouncedQ || undefined,
      page,
      page_size: pageSize,
    }),
    [action, dateFrom, dateTo, page, pageSize, debouncedQ, resourceType, userId]
  );

  const fetchKey = `admin-audit-${JSON.stringify(params)}`;
  const { data: auditData, isLoading } = useFetchOnNavigation(
    fetchKey,
    () => listAuditLogs(params)
  );

  const logs = auditData?.items ?? [];
  const total = auditData?.total ?? 0;

  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  useEffect(() => {
    Promise.all([
      listAdminUsers({ page_size: 500 }),
      listAuditFilterOptions(),
    ])
      .then(([usersData, optionsData]) => {
        setAllUsers(usersData.items);
        setOptions(optionsData);
      })
      .catch(() => {});
  }, []);

  const exportCsv = () => {
    const rows = logs.map((log) => ({
      created_at: log.created_at,
      user: log.user?.email || "",
      action: formatAuditActionTitle(log.action),
      action_key: log.action,
      resource_type: formatAuditResourceType(log.resource_type),
      resource_type_key: log.resource_type,
      ip_address: log.ip_address || "",
      details: JSON.stringify(log.details || {}),
    }));
    const csv = [
      Object.keys(
        rows[0] || {
          created_at: "",
          user: "",
          action: "",
          action_key: "",
          resource_type: "",
          resource_type_key: "",
          ip_address: "",
          details: "",
        }
      ).join(","),
      ...rows.map((row) =>
        Object.values(row)
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "audit-log.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isAdmin) {
    return <UnauthorizedPage resource="the audit log" />;
  }

  return (
    <div className="flex-1 space-y-6 px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Audit Log</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Filter and review every tracked action across users and RFI documents.
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={logs.length === 0}>
          <Download className="size-4" />
          Export CSV
        </Button>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="space-y-0 border-b py-3 px-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base font-semibold">Activity Feed</CardTitle>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
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

        <CardContent className="space-y-4 p-4">
          {/* Filters */}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search action, resource, IP…"
                className="pl-8"
              />
            </div>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="h-8 rounded-lg border bg-background px-3 text-sm"
            >
              <option value="">All users</option>
              {allUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email}
                </option>
              ))}
            </select>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="h-8 rounded-lg border bg-background px-3 text-sm"
            >
              <option value="">All actions</option>
              {options.actions.map((item) => (
                <option key={item} value={item}>
                  {formatAuditActionTitle(item)}
                </option>
              ))}
            </select>
            <select
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value)}
              className="h-8 rounded-lg border bg-background px-3 text-sm"
            >
              <option value="">All resources</option>
              {options.resource_types.map((item) => (
                <option key={item} value={item}>
                  {formatAuditResourceType(item)}
                </option>
              ))}
            </select>
            <div className="relative">
              {!dateFrom && (
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  Start Date
                </span>
              )}
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => {
                  setPage(1);
                  setDateFrom(event.target.value);
                }}
                className={`h-8 w-full rounded-lg border bg-background px-3 text-sm text-foreground ${!dateFrom ? "text-transparent" : ""}`}
              />
            </div>
            <div className="relative">
              {!dateTo && (
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  End Date
                </span>
                )}
              <input
                type="date"
                value={dateTo}
                onChange={(event) => {
                  setPage(1);
                  setDateTo(event.target.value);
                }}
                className={`h-8 w-full rounded-lg border bg-background px-3 text-sm text-foreground ${!dateTo ? "text-transparent" : ""}`}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3 rounded-xl border p-6">
              <Skeleton className="h-5 w-1/4" />
              <div className="space-y-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#f9fafb] hover:bg-[#f9fafb]">
                    <TableHead>When</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <ExactTime iso={log.created_at} className="text-sm text-muted-foreground" />
                      </TableCell>
                      <TableCell>
                        <UserPill name={log.user?.name} email={log.user?.email} />
                      </TableCell>
                      <TableCell>
                        <div className="flex min-w-0 max-w-[220px] flex-col gap-0.5">
                          <span className="truncate text-sm font-semibold leading-tight text-foreground">
                            {formatAuditActionTitle(log.action)}
                          </span>
                          <span className="truncate font-mono text-[11px] text-muted-foreground">
                            {log.action}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="block truncate font-medium">{formatAuditResourceType(log.resource_type)}</span>
                        <span className="block truncate font-mono text-[11px] text-muted-foreground">
                          {log.resource_type}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[280px]">
                        <button
                          type="button"
                          onClick={() => setDetailOpen(log.id)}
                          title="Click to view full JSON details"
                          className="block max-w-[260px] cursor-pointer truncate rounded bg-muted/50 px-1.5 py-0.5 text-left font-mono text-[11px] leading-relaxed text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          {JSON.stringify(log.details || {})}
                        </button>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{log.ip_address || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination footer */}
              <div className="flex items-center justify-between pt-2 text-sm text-muted-foreground">
                <span>
                  Showing {startItem}–{endItem} of {total} entr{total !== 1 ? "ies" : "y"}
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
            </>
          )}
        </CardContent>
      </Card>

      {detailOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={closeDetail}
        >
          <div
            className="relative w-full max-w-lg rounded-lg border bg-background p-0 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="text-sm font-semibold">Detail Data</span>
              <button
                type="button"
                onClick={closeDetail}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words px-4 py-3 font-mono text-xs leading-relaxed text-foreground">
              {JSON.stringify(
                logs.find((l) => l.id === detailOpen)?.details ?? {},
                null,
                2
              )}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
