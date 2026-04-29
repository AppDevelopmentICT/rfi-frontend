"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";

import { ExactTime } from "@/components/shared/RelativeTime";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { UserPill } from "@/components/shared/UserPill";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  listAdminUsers,
  listAuditFilterOptions,
  listAuditLogs,
  type AdminAuditLog,
  type AuditFilterOptions,
} from "@/services/admin.service";
import type { RFIUser } from "@/services/rfi.service";

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
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
  const [isLoading, setIsLoading] = useState(true);
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

  useEffect(() => {
    Promise.all([listAdminUsers(), listAuditFilterOptions()])
      .then(([usersData, optionsData]) => {
        setUsers(usersData);
        setOptions(optionsData);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setIsLoading(true);
        const data = await listAuditLogs(params);
        if (cancelled) return;
        setLogs(data.items);
        setTotal(data.total);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [params]);

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
            <Input
              type="date"
              value={dateFrom}
              onChange={(event) => {
                setPage(1);
                setDateFrom(event.target.value);
              }}
              title="From date"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(event) => {
                setPage(1);
                setDateTo(event.target.value);
              }}
              title="To date"
            />
          </div>

          {isLoading ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Loading audit logs...</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
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
                        <StatusBadge status={log.action.replace("rfi.", "").replace("admin.", "")} />
                      </TableCell>
                      <TableCell>{log.resource_type}</TableCell>
                      <TableCell className="max-w-[280px] truncate font-mono text-xs" title={JSON.stringify(log.details || {})}>
                        {JSON.stringify(log.details || {})}
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
    </div>
  );
}
