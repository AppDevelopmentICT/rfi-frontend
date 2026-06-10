"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileSpreadsheet,
  FileText,
  Loader2,
  Search,
  Trash2,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Folder,
} from "lucide-react";
import { toast } from "sonner";

import { ConfirmModal } from "@/components/shared/ConfirmModal";
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
  restoreRfiDocument,
  type RFIProjectResponse,
  type RFIUser,
} from "@/services/rfi.service";
import {
  listRfpProjects,
  softDeleteRfpProject,
  restoreRfpProject,
  type RFPProjectResponse,
} from "@/services/rfp.service";
import { ActionButtons } from "@/components/shared/ActionButtons";
import { cn } from "@/lib/utils";

type Tab = "all" | "rfi" | "rfp";
const filters = ["all", "draft", "generating", "completed", "failed", "trash"];

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

interface CombinedDoc {
  documentId: string;
  id?: number;
  slug?: string | null;
  type: "rfi" | "rfp";
  name: string;
  product?: string;
  status: string;
  created_at: string;
  updated_at: string;
  user?: RFIUser | null;
  uploaded_by?: RFIUser | null;
  editing_user?: RFIUser | null;
  is_locked_by_other?: boolean;
  is_lock_held_by_me?: boolean;
  is_deleted: boolean;
  deleted_at?: string | null;
}

export default function DocumentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [creatorFilter, setCreatorFilter] = useState("me"); // Defaults to Me (My Documents)
  const [sortBy, setSortBy] = useState<"modified" | "created" | "name">("modified");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  // Custom Confirmation Modal State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    docId: string;
    docType: "rfi" | "rfp";
    type: "delete" | "restore";
    label: string;
  } | null>(null);

  const { data: rfiDocs = [], isLoading: rfiLoading, refetch: refetchRfi } = useStaleData(
    "documents-rfi",
    () => listRfiDocuments({ include_deleted: true }).catch(() => [])
  );

  const { data: rfpDocs = [], isLoading: rfpLoading, refetch: refetchRfp } = useStaleData(
    "documents-rfp",
    () => listRfpProjects({ include_deleted: true }).catch(() => [])
  );

  const isLoading = rfiLoading || rfpLoading;

  useDocumentNotifications("documents-rfi");
  useDocumentNotifications("documents-rfp");

  // Get unique products in RFP documents for dropdown
  const uniqueProducts = useMemo(() => {
    const products = new Set<string>();
    rfpDocs.forEach((doc) => {
      if (doc.product) products.add(doc.product);
    });
    return Array.from(products).sort();
  }, [rfpDocs]);

  // Combine and map RFI and RFP documents
  const combinedDocs = useMemo(() => {
    const rfiMapped: CombinedDoc[] = rfiDocs.map((doc) => ({
      documentId: doc.documentId,
      id: doc.id,
      slug: doc.slug,
      type: "rfi",
      name: doc.fileName,
      status: doc.status,
      created_at: doc.created_at || "",
      updated_at: doc.updated_at || doc.created_at || "",
      user: doc.uploaded_by || doc.user,
      uploaded_by: doc.uploaded_by,
      editing_user: doc.editing_user,
      is_locked_by_other: doc.is_locked_by_other,
      is_lock_held_by_me: doc.is_lock_held_by_me,
      is_deleted: !!(doc as any).is_deleted,
      deleted_at: (doc as any).deleted_at,
    }));

    const rfpMapped: CombinedDoc[] = rfpDocs.map((doc) => ({
      documentId: doc.documentId,
      id: doc.id,
      slug: doc.slug,
      type: "rfp",
      name: doc.project_name || `${doc.product} – Chapter 3`,
      product: doc.product,
      status: doc.status,
      created_at: doc.created_at || "",
      updated_at: doc.updated_at || doc.created_at || "",
      user: doc.user,
      uploaded_by: doc.user,
      editing_user: doc.editing_user,
      is_locked_by_other: doc.is_locked_by_other,
      is_lock_held_by_me: doc.is_lock_held_by_me,
      is_deleted: !!(doc as any).is_deleted,
      deleted_at: (doc as any).deleted_at,
    }));

    return [...rfiMapped, ...rfpMapped];
  }, [rfiDocs, rfpDocs]);

  // Get unique creators for dropdown (excluding the current user, as they are covered by "Me")
  const uniqueCreators = useMemo(() => {
    const creators = new Map<string, string>();
    combinedDocs.forEach((doc) => {
      const u = doc.user;
      if (u && u.id !== user?.sql_id) {
        creators.set(String(u.id), u.name || u.email);
      }
    });
    return Array.from(creators.entries()).map(([id, name]) => ({ id, name }));
  }, [combinedDocs, user?.sql_id]);

  const filteredDocs = useMemo(() => {
    let docs = combinedDocs;

    // 1. Filter by Document Type tab
    if (tab === "rfi") {
      docs = docs.filter((d) => d.type === "rfi");
    } else if (tab === "rfp") {
      docs = docs.filter((d) => d.type === "rfp");
    }

    // 2. Filter by Trash / Deleted Status
    if (filter === "trash") {
      docs = docs.filter((d) => d.is_deleted === true);
    } else {
      docs = docs.filter((d) => d.is_deleted === false);
      if (filter !== "all") {
        docs = docs.filter((d) => d.status === filter);
      }
    }

    // 3. Filter by Creator
    if (creatorFilter === "me") {
      docs = docs.filter((d) => d.user ? String(d.user.id) === String(user?.sql_id) : false);
    } else if (creatorFilter !== "all") {
      docs = docs.filter((d) => d.user ? String(d.user.id) === creatorFilter : false);
    }

    // 4. Filter by Product (RFPs only or All tabs)
    if (productFilter !== "all") {
      docs = docs.filter((d) => d.product === productFilter);
    }

    // 5. Search filter
    const needle = query.trim().toLowerCase();
    if (needle) {
      docs = docs.filter((d) => {
        const nameMatch = d.name.toLowerCase().includes(needle);
        const productMatch = d.product?.toLowerCase().includes(needle) || false;
        const ownerName = d.user?.name || d.user?.email || "";
        const ownerMatch = ownerName.toLowerCase().includes(needle);
        return nameMatch || productMatch || ownerMatch;
      });
    }

    // 6. Sorting
    return [...docs].sort((a, b) => {
      if (sortBy === "created") {
        const timeA = new Date(a.created_at).getTime();
        const timeB = new Date(b.created_at).getTime();
        return timeB - timeA;
      }
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      const timeA = new Date(a.updated_at).getTime();
      const timeB = new Date(b.updated_at).getTime();
      return timeB - timeA;
    });
  }, [combinedDocs, tab, filter, creatorFilter, productFilter, query, sortBy, user?.sql_id]);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const triggerDelete = (docId: string, label: string, docType: "rfi" | "rfp") => {
    setConfirmConfig({ docId, docType, type: "delete", label });
    setIsConfirmOpen(true);
  };

  const triggerRestore = (docId: string, label: string, docType: "rfi" | "rfp") => {
    setConfirmConfig({ docId, docType, type: "restore", label });
    setIsConfirmOpen(true);
  };

  const handleModalConfirmAction = async () => {
    if (!confirmConfig) return;
    const { docId, docType, type, label } = confirmConfig;
    setIsConfirmOpen(false);
    setPendingAction(`${docType}:${docId}`);

    try {
      if (type === "delete") {
        if (docType === "rfi") {
          await softDeleteRfiDocument(docId);
        } else {
          await softDeleteRfpProject(docId);
        }
        toast.success(`Moved "${label}" to Trash`);
      } else {
        if (docType === "rfi") {
          await restoreRfiDocument(docId);
        } else {
          await restoreRfpProject(docId);
        }
        toast.success(`Restored "${label}"`);
      }
      refetchRfi();
      refetchRfp();
    } catch (error: unknown) {
      const actionText = type === "delete" ? "delete" : "restore";
      toast.error(getErrorMessage(error, `Failed to ${actionText} ${docType.toUpperCase()}`));
    } finally {
      setPendingAction(null);
      setConfirmConfig(null);
    }
  };

  const canDelete = (doc: CombinedDoc) => {
    if (user?.is_admin) return true;
    return doc.user?.id === user?.sql_id;
  };

  return (
    <div className="flex-1 space-y-6 px-6 py-6">
      {/* Header Row */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Documents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All generated RFI and RFP projects, owners, and active editing locks.
          </p>
        </div>
        <ActionButtons size="default" />
      </div>

      {/* Main card */}
      <Card className="border-border/70 shadow-sm">
        <CardContent className="space-y-4 p-4">
          
          {/* Tabs row: All, RFI, RFP */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={tab === "all" ? "default" : "outline"}
                size="sm"
                className="gap-2"
                onClick={() => setTab("all")}
              >
                <Folder className="size-4" />
                All
                <Badge variant="secondary" className="ml-1">
                  {combinedDocs.filter(d => filter === "trash" ? d.is_deleted : !d.is_deleted).length}
                </Badge>
              </Button>
              <Button
                variant={tab === "rfi" ? "default" : "outline"}
                size="sm"
                className="gap-2"
                onClick={() => setTab("rfi")}
              >
                <FileSpreadsheet className="size-4" />
                RFI
                <Badge variant="secondary" className="ml-1">
                  {combinedDocs.filter(d => d.type === "rfi" && (filter === "trash" ? d.is_deleted : !d.is_deleted)).length}
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
                  {combinedDocs.filter(d => d.type === "rfp" && (filter === "trash" ? d.is_deleted : !d.is_deleted)).length}
                </Badge>
              </Button>
            </div>

            {/* Quick Status Filters */}
            <div className="flex flex-wrap gap-1.5 rounded-lg border bg-muted/40 p-1">
              {filters.map((item) => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  className={cn(
                    "px-3 py-1 text-xs font-semibold rounded-md transition-all duration-200 capitalize",
                    filter === item
                      ? "bg-card text-foreground shadow-sm font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item === "trash" ? "Trash" : item}
                </button>
              ))}
            </div>
          </div>

          {/* Search bar & Advanced filter toggle */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 items-center gap-2 max-w-xl">
              <form onSubmit={handleSearchSubmit} className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search documents by name, product, or owner..."
                  className="pl-9"
                />
              </form>
              <Button
                variant={showAdvanced ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="gap-1.5 shrink-0"
              >
                <SlidersHorizontal className="size-4" />
                <span>Filters</span>
                {showAdvanced ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
              </Button>
            </div>
          </div>

          {/* Advanced Filters Panel */}
          {showAdvanced && (
            <div className="grid grid-cols-1 gap-4 rounded-xl border bg-muted/20 p-4 sm:grid-cols-3 animate-in fade-in slide-in-from-top-2 duration-200">
              
              {/* Creator Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Creator</label>
                <select
                  value={creatorFilter}
                  onChange={(e) => setCreatorFilter(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="me">Me (Default)</option>
                  <option value="all">Anyone (Whoever)</option>
                  {uniqueCreators.map((creator) => (
                    <option key={creator.id} value={creator.id}>
                      {creator.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product filter (RFP or Combined with RFPs) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Product</label>
                <select
                  value={productFilter}
                  onChange={(e) => setProductFilter(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="all">All Products</option>
                  {uniqueProducts.map((prod) => (
                    <option key={prod} value={prod}>{prod}</option>
                  ))}
                </select>
              </div>

              {/* Sort Order Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="modified">Last Modified</option>
                  <option value="created">Date Created</option>
                  <option value="name">Name / Project</option>
                </select>
              </div>
            </div>
          )}

          {/* Table Content */}
          {isLoading ? (
            <div className="space-y-3 rounded-xl border p-6">
              <Skeleton className="h-5 w-1/4" />
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <p className="font-medium">
                {filter === "trash" ? "No trashed documents found" : "No matching documents found"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try changing your filters or create a new project.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Generated By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Lock State</TableHead>
                  <TableHead>Last Modified</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocs.map((doc) => {
                  const editorName = doc.editing_user?.name || doc.editing_user?.email;
                  const deletingOrRestoring = pendingAction === `${doc.type}:${doc.documentId}`;
                  
                  return (
                    <TableRow key={`${doc.type}:${doc.documentId}`} className={cn(doc.is_deleted && "opacity-80")}>
                      <TableCell className="font-medium">
                        {doc.is_deleted ? (
                          <span className="text-muted-foreground line-through decoration-muted-foreground/50">
                            {doc.name}
                          </span>
                        ) : (
                          <Link href={`/${doc.type}/${doc.documentId}`} className="hover:underline">
                            {doc.name}
                          </Link>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "capitalize font-medium shadow-none",
                            doc.type === "rfi"
                              ? "border-blue-200 bg-blue-50/50 text-blue-700"
                              : "border-purple-200 bg-purple-50/50 text-purple-700"
                          )}
                        >
                          {doc.type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {doc.product ? (
                          <Badge variant="outline" className="font-normal shadow-none border-border/80">
                            {doc.product}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground/60">&mdash;</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <UserPill name={doc.user?.name} email={doc.user?.email} />
                      </TableCell>
                      <TableCell>
                        {doc.is_deleted ? (
                          <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 font-medium">
                            Deleted
                          </Badge>
                        ) : (
                          <StatusBadge status={doc.status} />
                        )}
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
                          {doc.is_deleted ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => triggerRestore(doc.documentId, doc.name, doc.type)}
                              disabled={deletingOrRestoring}
                              className="border-emerald-200 bg-emerald-50/20 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 gap-1.5"
                            >
                              {deletingOrRestoring ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <RotateCcw className="size-3.5" />
                              )}
                              Restore
                            </Button>
                          ) : (
                            <>
                              <Link href={`/${doc.type}/${doc.documentId}`}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className={cn(doc.is_locked_by_other && "border-amber-200 text-amber-700")}
                                >
                                  Open
                                </Button>
                              </Link>
                              {canDelete(doc) && (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => triggerDelete(doc.documentId, doc.name, doc.type)}
                                  disabled={deletingOrRestoring}
                                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                >
                                  {deletingOrRestoring ? (
                                    <Loader2 className="size-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="size-4" />
                                  )}
                                  <span className="sr-only">Delete</span>
                                </Button>
                              )}
                            </>
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

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleModalConfirmAction}
        title={confirmConfig?.type === "delete" ? "Move to Trash" : "Restore Document"}
        message={
          confirmConfig?.type === "delete"
            ? `Are you sure you want to move "${confirmConfig?.label}" to Trash? You can restore it later.`
            : `Are you sure you want to restore "${confirmConfig?.label}"? It will be moved back to active documents.`
        }
        confirmText={confirmConfig?.type === "delete" ? "Move to Trash" : "Restore"}
        cancelText="Cancel"
        type={confirmConfig?.type || "default"}
        isLoading={pendingAction !== null}
      />
    </div>
  );
}
