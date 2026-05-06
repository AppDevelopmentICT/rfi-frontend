"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, X } from "lucide-react";

import { ExactTime } from "@/components/shared/RelativeTime";
import { UserPill } from "@/components/shared/UserPill";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  type AdminAuditLog,
  type AuditFilterOptions,
} from "@/services/admin.service";
import type { RFIUser } from "@/services/rfi.service";


function normalizeAction(action: string): string {
  return action
    .replace(/^rfi\./, "")
    .replace(/^admin\./, "")
    .replace(/\./g, "_")
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .toLowerCase();
}

export default function AdminAuditLogPage() {
  const [users, setUsers] = useState<RFIUser[]>([]);
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
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [detailOpen, setDetailOpen] = useState<number | null>(null);

  const closeDetail = useCallback(() => setDetailOpen(null), []);
  const pageSize = 25;

  const params = useMemo(
    () => ({
      user_id: userId ? Number(userId) : undefined,
      action: action || undefined,
      resource_type: resourceType || undefined,
      date_from: dateFrom ? new Date(dateFrom).toISOString() : undefined,
      date_to: dateTo ? new Date(dateTo).toISOString() : undefined,
      q: q || undefined,
      page,
      page_size: pageSize,
    }),
    [action, dateFrom, dateTo, page, q, resourceType, userId]
  );

  const fetchKey = `admin-audit-${JSON.stringify(params)}`;
  const { data: auditData, isLoading, refetch } = useFetchOnNavigation(
    fetchKey,
    () => listAuditLogs(params)
  );

  const logs = auditData?.items ?? [];

  useEffect(() => {
    if (auditData?.total !== undefined) {
      setTotal(auditData.total);
    }
  }, [auditData?.total]);

  useEffect(() => {
    Promise.all([listAdminUsers(), listAuditFilterOptions()])
      .then(([usersData, optionsData]) => {
        setUsers(usersData);
        setOptions(optionsData);
      })
      .catch(() => {});
  }, []);

  const exportCsv = () => {
    const rows = logs.map((log) => ({
      created_at: log.created_at,
      user: log.user?.email || "",
      action: log.action,
      resource_type: log.resource_type,
      ip_address: log.ip_address || "",
      details: JSON.stringify(log.details || {}),
    }));
    const csv = [
      Object.keys(rows[0] || { created_at: "", user: "", action: "", resource_type: "", ip_address: "", details: "" }).join(","),
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
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <Input
              value={q}
              onChange={(event) => {
                setPage(1);
                setQ(event.target.value);
              }}
              placeholder="Search action, resource, IP..."
            />
            <select
              value={userId}
              onChange={(event) => {
                setPage(1);
                setUserId(event.target.value);
              }}
              className="h-8 rounded-lg border bg-background px-3 text-sm"
            >
              <option value="">All users</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email}
                </option>
              ))}
            </select>
            <select
              value={action}
              onChange={(event) => {
                setPage(1);
                setAction(event.target.value);
              }}
              className="h-8 rounded-lg border bg-background px-3 text-sm"
            >
              <option value="">All actions</option>
              {options.actions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select
              value={resourceType}
              onChange={(event) => {
                setPage(1);
                setResourceType(event.target.value);
              }}
              className="h-8 rounded-lg border bg-background px-3 text-sm"
            >
              <option value="">All resources</option>
              {options.resource_types.map((item) => (
                <option key={item} value={item}>
                  {item}
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
                        <span className="inline-flex h-5 items-center rounded-md border border-border/60 bg-background px-2 text-[11px] font-medium text-muted-foreground">
                          {normalizeAction(log.action)}
                        </span>
                      </TableCell>
                      <TableCell>{log.resource_type}</TableCell>
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
              <div className="flex items-center justify-between pt-2 text-sm text-muted-foreground">
                <span>
                  Showing {logs.length} of {total}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(current - 1, 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page * pageSize >= total}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Next
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
