"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertOctagon,
  FileSpreadsheet,
  FileText,
  History,
  Loader2,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { RelativeTime } from "@/components/shared/RelativeTime";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { UserPill } from "@/components/shared/UserPill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  hardDeleteAdminRfi,
  hardDeleteAdminRfp,
  listAdminProjects,
  listAdminTrash,
  restoreAdminRfi,
  restoreAdminRfp,
  type AdminTrashItem,
  type AdminTrashResponse,
} from "@/services/admin.service";
import { useAuth } from "@/contexts/auth-context";

type Tab = "trash" | "active";

function getErrorMessage(error: unknown, fallback = "Request failed") {
  if (error instanceof Error) return error.message;
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: { data?: { detail?: unknown } } }).response?.data?.detail === "string"
  ) {
    return String((error as { response: { data: { detail: string } } }).response.data.detail);
  }
  return fallback;
}

function itemLabel(item: AdminTrashItem): string {
  if (item.type === "rfi") return item.fileName || item.filename || `RFI #${item.id}`;
  return item.project_name || `${item.product || "RFP"} – Chapter 3`;
}

function itemHref(item: AdminTrashItem): string {
  return `/${item.type}/${item.documentId}`;
}

export default function AdminTrashPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("trash");
  const [trash, setTrash] = useState<AdminTrashResponse>({ rfi: [], rfp: [] });
  const [active, setActive] = useState<AdminTrashResponse>({ rfi: [], rfp: [] });
  const [resourceTab, setResourceTab] = useState<"rfi" | "rfp">("rfi");
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [trashed, full] = await Promise.all([
        listAdminTrash(),
        listAdminProjects({ include_deleted: true }),
      ]);
      setTrash(trashed);
      setActive(full);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to load admin data"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
  }, [loadAll]);

  const isAdmin = !!user?.is_admin;

  const dataset = useMemo(() => {
    const source = tab === "trash" ? trash : active;
    return resourceTab === "rfi" ? source.rfi : source.rfp;
  }, [tab, trash, active, resourceTab]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return dataset;
    return dataset.filter((item) => itemLabel(item).toLowerCase().includes(needle));
  }, [dataset, query]);

  const restoreItem = async (item: AdminTrashItem) => {
    if (!window.confirm(`Restore "${itemLabel(item)}"?`)) return;
    setPendingId(`${item.type}:${item.id}`);
    try {
      if (item.type === "rfi") await restoreAdminRfi(item.id);
      else await restoreAdminRfp(item.id);
      toast.success("Restored");
      await loadAll();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to restore"));
    } finally {
      setPendingId(null);
    }
  };

  const hardDelete = async (item: AdminTrashItem) => {
    if (
      !window.confirm(
        `Permanently delete "${itemLabel(item)}"? This action cannot be undone.`,
      )
    ) {
      return;
    }
    setPendingId(`${item.type}:${item.id}`);
    try {
      if (item.type === "rfi") await hardDeleteAdminRfi(item.id);
      else await hardDeleteAdminRfp(item.id);
      toast.success("Permanently deleted");
      await loadAll();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to delete"));
    } finally {
      setPendingId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="rounded-lg border bg-background p-6 text-sm text-muted-foreground shadow-sm">
          <AlertOctagon className="mb-2 size-5 text-amber-600" />
          You need administrator access to view this page.
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 px-6 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Trash &amp; Recover</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All RFI and RFP projects with status. Restore deleted items or permanently remove
            them.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={tab === "trash" ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => setTab("trash")}
          >
            <Trash2 className="size-4" />
            Trash
            <Badge variant="secondary" className="ml-1">
              {trash.rfi.length + trash.rfp.length}
            </Badge>
          </Button>
          <Button
            variant={tab === "active" ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => setTab("active")}
          >
            <History className="size-4" />
            All Projects
            <Badge variant="secondary" className="ml-1">
              {active.rfi.length + active.rfp.length}
            </Badge>
          </Button>
        </div>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="flex-row items-center justify-between space-y-0 border-b py-3">
          <CardTitle className="flex items-center gap-2 text-base">
            {resourceTab === "rfi" ? (
              <FileSpreadsheet className="size-4" />
            ) : (
              <FileText className="size-4" />
            )}
            {tab === "trash" ? "Deleted" : "All"} {resourceTab.toUpperCase()}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={resourceTab === "rfi" ? "default" : "outline"}
              size="sm"
              onClick={() => setResourceTab("rfi")}
            >
              RFI
            </Button>
            <Button
              variant={resourceTab === "rfp" ? "default" : "outline"}
              size="sm"
              onClick={() => setResourceTab("rfp")}
            >
              RFP
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${resourceTab.toUpperCase()} by name...`}
            className="max-w-md"
          />
          {isLoading ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Loading...</p>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <p className="font-medium">
                {tab === "trash"
                  ? `No deleted ${resourceTab.toUpperCase()}`
                  : `No ${resourceTab.toUpperCase()} found`}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {tab === "trash"
                  ? "Items moved to trash will appear here."
                  : "Items are listed regardless of status."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  {resourceTab === "rfp" && <TableHead>Product</TableHead>}
                  <TableHead>Status</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Last Modified</TableHead>
                  {tab === "trash" && <TableHead>Deleted By</TableHead>}
                  {tab === "trash" && <TableHead>Deleted At</TableHead>}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => {
                  const pending = pendingId === `${item.type}:${item.id}`;
                  return (
                    <TableRow key={`${item.type}-${item.id}`}>
                      <TableCell className="font-medium">
                        {item.is_deleted ? (
                          <span>{itemLabel(item)}</span>
                        ) : (
                          <Link href={itemHref(item)} className="hover:underline">
                            {itemLabel(item)}
                          </Link>
                        )}
                      </TableCell>
                      {resourceTab === "rfp" && (
                        <TableCell>
                          {item.product ? (
                            <Badge variant="outline">{item.product}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        {item.is_deleted ? (
                          <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                            Deleted
                          </Badge>
                        ) : (
                          <StatusBadge status={item.status} />
                        )}
                      </TableCell>
                      <TableCell>
                        <UserPill name={item.owner?.name} email={item.owner?.email} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <RelativeTime
                          iso={item.updated_at || item.created_at || undefined}
                        />
                      </TableCell>
                      {tab === "trash" && (
                        <TableCell>
                          <UserPill
                            name={item.deleted_by?.name}
                            email={item.deleted_by?.email}
                          />
                        </TableCell>
                      )}
                      {tab === "trash" && (
                        <TableCell className="text-muted-foreground">
                          <RelativeTime iso={item.deleted_at || undefined} />
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {item.is_deleted ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => restoreItem(item)}
                                disabled={pending}
                                className="gap-1.5 text-emerald-700 hover:bg-emerald-50"
                              >
                                {pending ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <RotateCcw className="size-4" />
                                )}
                                Restore
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => hardDelete(item)}
                                disabled={pending}
                                className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="size-4" />
                                Delete forever
                              </Button>
                            </>
                          ) : (
                            <Link href={itemHref(item)}>
                              <Button variant="outline" size="sm">
                                Open
                              </Button>
                            </Link>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
