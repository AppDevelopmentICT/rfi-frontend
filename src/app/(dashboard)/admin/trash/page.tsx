"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FileSpreadsheet,
  FileText,
  Loader2,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { RelativeTime } from "@/components/shared/RelativeTime";
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
import {
  hardDeleteAdminRfi,
  hardDeleteAdminRfp,
  listAdminTrash,
  restoreAdminRfi,
  restoreAdminRfp,
  type AdminTrashItem,
  type AdminTrashResponse,
} from "@/services/admin.service";
import { useAuth } from "@/contexts/auth-context";
import { useFetchOnNavigation } from "@/hooks/useFetchOnNavigation";

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

export default function AdminTrashPage() {
  const { user } = useAuth();
  const [resourceTab, setResourceTab] = useState<"rfi" | "rfp">("rfi");
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const { data: fetchedTrash = { rfi: [], rfp: [] }, isLoading, refetch } = useFetchOnNavigation(
    "/admin/trash",
    listAdminTrash
  );

  const [trash, setTrash] = useState<AdminTrashResponse>({ rfi: [], rfp: [] });

  // Sync local state with fetched data (defer setState out of the synchronous effect body)
  useEffect(() => {
    queueMicrotask(() => {
      setTrash(fetchedTrash);
    });
  }, [fetchedTrash]);

  const isAdmin = !!user?.is_admin;

  const dataset = useMemo(() => {
    const source = resourceTab === "rfi" ? trash.rfi : trash.rfp;
    // Client-side safety filter: only show items confirmed as deleted
    return source.filter((item) => item.is_deleted === true);
  }, [trash, resourceTab]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return dataset;
    return dataset.filter((item) => itemLabel(item).toLowerCase().includes(needle));
  }, [dataset, query]);

  const restoreItem = async (item: AdminTrashItem) => {
    const key = `${item.type}:${item.id}`;
    if (!window.confirm(`Restore "${itemLabel(item)}?`)) return;
    setPendingId(key);

    // Optimistic update: remove item from trash immediately
    setTrash((prev) => ({
      rfi: prev.rfi.filter((i) => `${i.type}:${i.id}` !== key),
      rfp: prev.rfp.filter((i) => `${i.type}:${i.id}` !== key),
    }));

    try {
      if (item.type === "rfi") await restoreAdminRfi(item.id);
      else await restoreAdminRfp(item.id);
      toast.success(`"${itemLabel(item)}" restored`);
    } catch (error: unknown) {
      // Rollback on failure
      toast.error(getErrorMessage(error, "Failed to restore"));
      refetch();
    } finally {
      setPendingId(null);
    }
  };

  const hardDelete = async (item: AdminTrashItem) => {
    const key = `${item.type}:${item.id}`;
    if (
      !window.confirm(
        `Permanently delete "${itemLabel(item)}"? This action cannot be undone.`,
      )
    ) {
      return;
    }
    setPendingId(key);

    // Optimistic update: remove item from trash immediately
    setTrash((prev) => ({
      rfi: prev.rfi.filter((i) => `${i.type}:${i.id}` !== key),
      rfp: prev.rfp.filter((i) => `${i.type}:${i.id}` !== key),
    }));

    try {
      if (item.type === "rfi") await hardDeleteAdminRfi(item.id);
      else await hardDeleteAdminRfp(item.id);
      toast.success(`"${itemLabel(item)}" permanently deleted`);
    } catch (error: unknown) {
      // Rollback on failure
      toast.error(getErrorMessage(error, "Failed to delete"));
      refetch();
    } finally {
      setPendingId(null);
    }
  };

  if (!isAdmin) {
    return <UnauthorizedPage resource="the trash and recovery page" />;
  }

  return (
    <div className="flex-1 space-y-6 px-6 py-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Trash &amp; Recover</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Restore deleted RFI/RFP projects or permanently remove them.
        </p>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="flex-row items-center justify-between space-y-0 border-b py-3">
          <CardTitle className="flex items-center gap-2 text-base">
            {resourceTab === "rfi" ? (
              <FileSpreadsheet className="size-4" />
            ) : (
              <FileText className="size-4" />
            )}
            Deleted {resourceTab.toUpperCase()}
            <Badge variant="secondary" className="ml-1">
              {dataset.length}
            </Badge>
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
            placeholder={`Search deleted ${resourceTab.toUpperCase()} by name...`}
            className="max-w-md"
          />
          {isLoading ? (
            <div className="space-y-3 rounded-xl border p-6">
              <Skeleton className="h-5 w-1/4" />
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <p className="font-medium">
                No deleted {resourceTab.toUpperCase()}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Items moved to trash will appear here.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-[#f9fafb] hover:bg-[#f9fafb]">
                  <TableHead>Name</TableHead>
                  {resourceTab === "rfp" && <TableHead>Product</TableHead>}
                  <TableHead>Status</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Last Modified</TableHead>
                  <TableHead>Deleted By</TableHead>
                  <TableHead>Deleted At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => {
                  const pending = pendingId === `${item.type}:${item.id}`;
                  return (
                    <TableRow key={`${item.type}-${item.id}`}>
                      <TableCell className="font-medium">
                        <span>{itemLabel(item)}</span>
                      </TableCell>
                      {resourceTab === "rfp" && (
                        <TableCell>
                          {item.product ? (
                            <Badge variant="outline">{item.product}</Badge>
                          ) : (
                            <span className="text-muted-foreground">&mdash;</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                          Deleted
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <UserPill name={item.owner?.name} email={item.owner?.email} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <RelativeTime
                          iso={item.updated_at || item.created_at || undefined}
                        />
                      </TableCell>
                      <TableCell>
                        <UserPill
                          name={item.deleted_by?.name}
                          email={item.deleted_by?.email}
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <RelativeTime iso={item.deleted_at || undefined} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => restoreItem(item)}
                            disabled={pending}
                            title="Restore"
                            className="size-8 rounded-md text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                          >
                            {pending ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <RotateCcw className="size-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => hardDelete(item)}
                            disabled={pending}
                            title="Delete permanently"
                            className="size-8 rounded-md text-red-500 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="size-4" />
                          </Button>
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
