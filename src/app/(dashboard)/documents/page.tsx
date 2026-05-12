"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, FileText, Loader2, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { RelativeTime } from "@/components/shared/RelativeTime";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { UserPill } from "@/components/shared/UserPill";
import { Badge } from "@/components/ui/badge";
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
import { useAuth } from "@/contexts/auth-context";
import { useStaleData } from "@/hooks/useStaleData";
import { useDocumentNotifications } from "@/hooks/useDocumentNotifications";
import {
  listRfiDocuments,
  softDeleteRfiDocument,
  type RFIProjectResponse,
} from "@/services/rfi.service";
import {
  listRfpProjects,
  softDeleteRfpProject,
  type RFPProjectResponse,
} from "@/services/rfp.service";
import { ActionButtons } from "@/components/shared/ActionButtons";
import { cn } from "@/lib/utils";

type Tab = "rfi" | "rfp";
const filters = ["all", "draft", "generating", "completed", "failed"];

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

export default function DocumentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("rfi");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const { data: rfiDocs = [], isLoading: rfiLoading, refetch: refetchRfi } = useStaleData(
    "documents-rfi",
    () => listRfiDocuments().catch(() => [])
  );

  const { data: rfpDocs = [], isLoading: rfpLoading, refetch: refetchRfp } = useStaleData(
    "documents-rfp",
    () => listRfpProjects().catch(() => [])
  );

  const isLoading = rfiLoading || rfpLoading;

  useDocumentNotifications("documents-rfi");
  useDocumentNotifications("documents-rfp");

  const filteredRfi = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rfiDocs.filter((doc) => {
      const matchesStatus = filter === "all" || doc.status === filter;
      const matchesQuery = !needle || doc.fileName.toLowerCase().includes(needle);
      return matchesStatus && matchesQuery;
    });
  }, [rfiDocs, filter, query]);

  const filteredRfp = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rfpDocs.filter((doc) => {
      const matchesStatus = filter === "all" || doc.status === filter;
      const matchesQuery =
        !needle ||
        (doc.project_name || "").toLowerCase().includes(needle) ||
        doc.product.toLowerCase().includes(needle);
      return matchesStatus && matchesQuery;
    });
  }, [rfpDocs, filter, query]);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const handleDeleteRfi = async (documentId: string, label: string) => {
    if (!window.confirm(`Move "${label}" to Trash? Admins can restore it later.`)) return;
    setPendingDelete(`rfi:${documentId}`);
    try {
      await softDeleteRfiDocument(documentId);
      toast.success(`Moved "${label}" to Trash`);
      refetchRfi();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to delete RFI"));
    } finally {
      setPendingDelete(null);
    }
  };

  const handleDeleteRfp = async (documentId: string, label: string) => {
    if (!window.confirm(`Move "${label}" to Trash? Admins can restore it later.`)) return;
    setPendingDelete(`rfp:${documentId}`);
    try {
      await softDeleteRfpProject(documentId);
      toast.success(`Moved "${label}" to Trash`);
      refetchRfp();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to delete RFP"));
    } finally {
      setPendingDelete(null);
    }
  };

  const canDeleteRfi = (doc: RFIProjectResponse) => {
    if (user?.is_admin) return true;
    return doc.user?.id === user?.id || doc.uploaded_by?.id === user?.id;
  };
  const canDeleteRfp = (doc: RFPProjectResponse) => {
    if (user?.is_admin) return true;
    return doc.user?.id === user?.id;
  };

  return (
    <div className="flex-1 space-y-6 px-6 py-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Documents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All generated RFI and RFP projects, owners, and active editing locks.
          </p>
        </div>
        <ActionButtons size="default" />
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={tab === "rfi" ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => setTab("rfi")}
            >
              <FileSpreadsheet className="size-4" />
              RFI
              <Badge variant="secondary" className="ml-1">
                {rfiDocs.length}
              </Badge>
            </Button>
            <Button
              variant={tab === "rfp" ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => setTab("rfp")}
            >
              <FileText className="size-4" />
              RFP
              <Badge variant="secondary" className="ml-1">
                {rfpDocs.length}
              </Badge>
            </Button>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <form onSubmit={handleSearchSubmit} className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={
                  tab === "rfi"
                    ? "Search RFI by filename..."
                    : "Search RFP by name or product..."
                }
                className="pl-9"
              />
            </form>
            <div className="flex flex-wrap gap-2">
              {filters.map((item) => (
                <Button
                  key={item}
                  variant={filter === item ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setFilter(item)}
                  className={cn(
                    "capitalize",
                    filter === item && "bg-foreground/10 text-foreground font-semibold hover:bg-foreground/15",
                  )}
                >
                  {item}
                </Button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3 rounded-xl border p-6">
              <Skeleton className="h-5 w-1/4" />
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </div>
          ) : tab === "rfi" ? (
            filteredRfi.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <p className="font-medium">No matching RFI</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try changing the filter or upload a new RFI.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Filename</TableHead>
                    <TableHead>Generated By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Lock State</TableHead>
                    <TableHead>Last Modified</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRfi.map((doc) => {
                    const editorName = doc.editing_user?.name || doc.editing_user?.email;
                    const deleting = pendingDelete === `rfi:${doc.documentId}`;
                    return (
                      <TableRow key={doc.documentId}>
                        <TableCell className="font-medium">
                          <Link href={`/rfi/${doc.documentId}`} className="hover:underline">
                            {doc.fileName}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <UserPill name={doc.uploaded_by?.name} email={doc.uploaded_by?.email} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={doc.status} />
                        </TableCell>
                        <TableCell>
                          {editorName ? (
                            <div className="flex items-center gap-2 text-sm text-amber-700">
                              <span className="size-2 animate-pulse rounded-full bg-amber-500" />
                              Editing by {editorName}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Available</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <RelativeTime
                            iso={doc.updated_at || doc.created_at}
                            className="text-muted-foreground"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Link href={`/rfi/${doc.documentId}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className={cn(doc.is_locked_by_other && "border-amber-200 text-amber-700")}
                              >
                                Open
                              </Button>
                            </Link>
                            {canDeleteRfi(doc) && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleDeleteRfi(doc.documentId, doc.fileName)}
                                disabled={deleting}
                                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              >
                                {deleting ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <Trash2 className="size-4" />
                                )}
                                <span className="sr-only">Delete</span>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )
          ) : filteredRfp.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <p className="font-medium">No matching RFP</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try changing the filter or start a new RFP.
              </p>
              <Link href="/rfp/upload">
                <Button size="sm" className="mt-4">
                  New RFP
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Generated By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Lock State</TableHead>
                  <TableHead>Last Modified</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRfp.map((doc) => {
                  const editorName = doc.editing_user?.name || doc.editing_user?.email;
                  const label = doc.project_name || `${doc.product} – Chapter 3`;
                  const deleting = pendingDelete === `rfp:${doc.documentId}`;
                  return (
                    <TableRow key={doc.documentId}>
                      <TableCell className="font-medium">
                        <Link href={`/rfp/${doc.documentId}`} className="hover:underline">
                          {label}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{doc.product}</Badge>
                      </TableCell>
                      <TableCell>
                        <UserPill name={doc.user?.name} email={doc.user?.email} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={doc.status} />
                      </TableCell>
                      <TableCell>
                        {editorName ? (
                          <div className="flex items-center gap-2 text-sm text-amber-700">
                            <span className="size-2 animate-pulse rounded-full bg-amber-500" />
                            Editing by {editorName}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Available</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <RelativeTime
                          iso={doc.updated_at || doc.created_at}
                          className="text-muted-foreground"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/rfp/${doc.documentId}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(doc.is_locked_by_other && "border-amber-200 text-amber-700")}
                            >
                              Open
                            </Button>
                          </Link>
                          {canDeleteRfp(doc) && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleDeleteRfp(doc.documentId, label)}
                              disabled={deleting}
                              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              {deleting ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Trash2 className="size-4" />
                              )}
                              <span className="sr-only">Delete</span>
                            </Button>
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
