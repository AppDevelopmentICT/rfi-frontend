"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  FileIcon,
  Trash2,
  RefreshCw,
  Check,
  AlertCircle,
  Database,
  Server,
  ArrowDown,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown as ArrowDownIcon,
  CheckCircle2,
  Loader2,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

import { FileUpload } from "@/components/shared/FileUpload";
import {
  ingestKnowledgeDocument,
  syncKnowledgeBase,
  listKnowledgeDocuments,
  deleteKnowledgeDocument,
} from "@/services/knowledge.service";
import type { KBDocument, SyncResult } from "@/services/knowledge.service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const STATUS_VARIANTS: Record<string, string> = {
  completed: "default",
  processing: "secondary",
  failed: "destructive",
};

type SortKey = "filename" | "status" | "source" | "created_at";
type SortDir = "asc" | "desc";

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="size-3" />;
    case "processing":
      return <Loader2 className="size-3 animate-spin" />;
    case "failed":
      return <XCircle className="size-3" />;
    default:
      return null;
  }
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function SortableHeader({
  label,
  sortKey,
  currentSort,
  currentDir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const isActive = currentSort === sortKey;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
      >
        {label}
        {isActive ? (
          currentDir === "asc" ? (
            <ArrowUp className="size-3" />
          ) : (
            <ArrowDownIcon className="size-3" />
          )
        ) : (
          <ArrowUpDown className="size-3 opacity-40" />
        )}
      </button>
    </TableHead>
  );
}

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<KBDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [pendingDelete, setPendingDelete] = useState<KBDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PER_PAGE = 10;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortDir("asc");
      }
      return key;
    });
    setPage(1);
  }, []);

  const loadDocuments = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoadingDocs(true);
      try {
        const response = await listKnowledgeDocuments({
          search: debouncedSearch || undefined,
          sort_by: sortKey,
          sort_dir: sortDir,
          page,
          per_page: PER_PAGE,
        });
        setDocuments(response.documents);
        setTotalPages(response.total_pages);
        setTotalCount(response.total);
      } catch (error: any) {
        console.error("Failed to load documents:", error);
        if (!silent) toast.error("Failed to load knowledge base documents");
      } finally {
        setIsLoadingDocs(false);
      }
    },
    [debouncedSearch, sortKey, sortDir, page]
  );

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setIsUploading(true);

    const pendingIds = acceptedFiles.map((_, i) => -(Date.now() + i));
    const now = new Date().toISOString();
    setDocuments((prev) => [
      ...acceptedFiles.map((file, i) => ({
        id: pendingIds[i],
        filename: file.name,
        status: "processing" as const,
        source: "upload" as const,
        minio_key: null,
        created_at: now,
      })),
      ...prev,
    ]);

    for (let idx = 0; idx < acceptedFiles.length; idx++) {
      const file = acceptedFiles[idx];
      try {
        const result = await ingestKnowledgeDocument(file);
        toast.success(`Vectorized ${file.name} successfully`);

        setDocuments((prev) =>
          prev.map((doc) =>
            doc.id === pendingIds[idx]
              ? {
                  id: result.document_id,
                  filename: file.name,
                  status:
                    result.status === "success" ? "completed" : result.status,
                  source: "upload" as const,
                  minio_key: null,
                  created_at: doc.created_at,
                }
              : doc
          )
        );
      } catch (error: any) {
        toast.error(
          `Failed to ingest ${file.name}: ${error.message || "Unknown Error"}`
        );
        setDocuments((prev) =>
          prev.map((doc) =>
            doc.id === pendingIds[idx] ? { ...doc, status: "failed" } : doc
          )
        );
      }
    }

    await loadDocuments(true);
    setIsUploading(false);
  };

  // Handle MinIO sync
  const handleSync = async () => {
    setIsSyncing(true);
    setLastSyncResult(null);

    try {
      const result = await syncKnowledgeBase();
      setLastSyncResult(result);

      const parts: string[] = [];
      if (result.added.length > 0) parts.push(`+${result.added.length} added`);
      if (result.updated.length > 0)
        parts.push(`~${result.updated.length} updated`);
      if (result.removed.length > 0)
        parts.push(`-${result.removed.length} removed`);
      if (result.unchanged > 0) parts.push(`${result.unchanged} unchanged`);
      if (result.errors.length > 0)
        parts.push(`${result.errors.length} errors`);

      const message = parts.join(", ") || "Everything up to date";

      if (result.errors.length > 0) {
        toast.warning(`Sync completed with issues: ${message}`);
      } else {
        toast.success(`Sync complete: ${message}`);
      }

      await loadDocuments(true);
    } catch (error: any) {
      toast.error(`Sync failed: ${error.message || "Unknown error"}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle document deletion
  const handleDelete = async (doc: KBDocument) => {
    setIsDeleting(true);
    try {
      await deleteKnowledgeDocument(doc.id);
      setPendingDelete(null);
      toast.success(`Deleted "${doc.filename}" and its vector chunks`);
      await loadDocuments(true);
    } catch (error: any) {
      toast.error(
        `Failed to delete ${doc.filename}: ${error.message || "Unknown error"}`
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 p-6">
      {/* Header with sync button */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Knowledge Base</h1>
          <p className="text-sm text-muted-foreground">
            Upload and manage reference documents that power your RFP responses.
            Supported formats: PDF, DOCX, TXT, and MD.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            id="sync-minio-btn"
            onClick={handleSync}
            disabled={isSyncing}
            className="group relative gap-2 rounded-full bg-muted/80 font-medium text-muted-foreground shadow-none transition-all duration-300 hover:bg-muted hover:text-foreground hover:shadow-sm active:scale-[0.97] disabled:opacity-60 dark:bg-muted/40 dark:hover:bg-muted/60 border border-border/50 hover:border-border"
          >
            <span className="relative flex size-4 items-center justify-center">
              <Server
                className={`size-3.5 absolute transition-all duration-300 ${
                  isSyncing
                    ? "opacity-0 scale-50 rotate-90"
                    : "opacity-100 scale-100 rotate-0"
                }`}
              />
              <RefreshCw
                className={`size-3.5 absolute transition-all duration-300 ${
                  isSyncing
                    ? "opacity-100 scale-100 animate-spin"
                    : "opacity-0 scale-50 -rotate-90"
                }`}
              />
            </span>
            <span className="transition-all duration-200">
              {isSyncing ? "Syncing\u2026" : "Sync from MinIO"}
            </span>
            {!isSyncing && (
              <ArrowDown className="size-3 opacity-40 transition-all duration-300 group-hover:opacity-70 group-hover:translate-y-0.5" />
            )}
            {isSyncing && (
              <span className="flex gap-0.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="size-0.5 rounded-full bg-current animate-pulse"
                    style={{ animationDelay: `${i * 200}ms` }}
                  />
                ))}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Sync result banner */}
      {lastSyncResult && !isSyncing && (
        <div
          className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm animate-in fade-in slide-in-from-top-2 duration-300 ${
            lastSyncResult.errors.length > 0
              ? "border-amber-500/30 bg-amber-50/50 text-amber-800 dark:border-amber-400/30 dark:bg-amber-950/30 dark:text-amber-200"
              : "border-emerald-500/30 bg-emerald-50/50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-950/30 dark:text-emerald-200"
          }`}
        >
          {lastSyncResult.errors.length > 0 ? (
            <AlertCircle className="size-4 shrink-0" />
          ) : (
            <Check className="size-4 shrink-0" />
          )}
          <span>
            <strong>
              {lastSyncResult.added.length > 0 ||
              lastSyncResult.removed.length > 0 ||
              lastSyncResult.updated.length > 0
                ? "Synced"
                : "Up to date"}
            </strong>
            {" — "}
            {lastSyncResult.added.length > 0 &&
              `${lastSyncResult.added.length} ingested`}
            {lastSyncResult.updated.length > 0 &&
              `${
                lastSyncResult.added.length > 0 ||
                lastSyncResult.removed.length > 0
                  ? ", "
                  : ""
              }${lastSyncResult.updated.length} re-ingested`}
            {lastSyncResult.added.length > 0 &&
              lastSyncResult.removed.length > 0 &&
              ", "}
            {lastSyncResult.removed.length > 0 &&
              `${lastSyncResult.removed.length} removed`}
            {lastSyncResult.unchanged > 0 &&
              ` · ${lastSyncResult.unchanged} unchanged`}
            {lastSyncResult.errors.length > 0 &&
              ` · ${lastSyncResult.errors.length} failed`}
          </span>
        </div>
      )}

      {/* Upload Section */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">
          Upload Documents
        </h2>
        <FileUpload
          onDrop={handleDrop}
          accept={{
            "application/pdf": [".pdf"],
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
              [".docx"],
            "text/plain": [".txt"],
            "text/markdown": [".md"],
          }}
          title="Drag & drop files here, or click to browse"
          description="PDF, DOCX, TXT, or MD — up to 10 MB per file"
        />
        {isUploading && (
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground animate-pulse font-medium">
            <RefreshCw className="size-3.5 animate-spin" />
            Vectorizing documents...
          </div>
        )}
      </section>

      {/* File Table Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">
            Ingested Files
          </h2>
          <span className="text-xs text-muted-foreground">
            {totalCount} file{totalCount !== 1 ? "s" : ""}
            {totalPages > 1 && (
              <>
                {" "}
                &middot; Page {page} of {totalPages}
              </>
            )}
          </span>
        </div>

        {documents.length > 0 || debouncedSearch ? (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/60" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-9 text-sm bg-muted/30 border-border/50 focus-visible:bg-background"
            />
          </div>
        ) : null}

        {isLoadingDocs ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/20 py-12 text-center">
            <RefreshCw className="mb-3 size-6 text-muted-foreground/40 animate-spin" />
            <p className="text-sm text-muted-foreground">
              Loading documents...
            </p>
          </div>
        ) : totalCount === 0 && !debouncedSearch ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/20 py-12 text-center">
            <FileIcon className="mb-3 size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No documents in your knowledge base yet.
            </p>
            <p className="text-xs text-muted-foreground/70">
              Upload files above or sync from MinIO to get started.
            </p>
          </div>
        ) : documents.length === 0 && debouncedSearch ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/20 py-12 text-center">
            <Search className="mb-3 size-6 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No files matching &quot;{searchQuery}&quot;
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="mt-1 text-xs text-primary hover:underline"
            >
              Clear search
            </button>
          </div>
        ) : (
          <>
            <div className="rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <SortableHeader
                      label="File Name"
                      sortKey="filename"
                      currentSort={sortKey}
                      currentDir={sortDir}
                      onSort={handleSort}
                      className="pl-4"
                    />
                    <SortableHeader
                      label="Source"
                      sortKey="source"
                      currentSort={sortKey}
                      currentDir={sortDir}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Status"
                      sortKey="status"
                      currentSort={sortKey}
                      currentDir={sortDir}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Uploaded"
                      sortKey="created_at"
                      currentSort={sortKey}
                      currentDir={sortDir}
                      onSort={handleSort}
                    />
                    <TableHead className="text-right pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-2">
                          <FileText className="size-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <span className="font-medium block truncate">
                              {doc.filename}
                            </span>
                            {doc.minio_key &&
                              doc.minio_key !== doc.filename && (
                                <span className="text-xs text-muted-foreground/60 block truncate">
                                  {doc.minio_key}
                                </span>
                              )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            doc.source === "minio" ? "secondary" : "outline"
                          }
                          className="gap-1"
                        >
                          {doc.source === "minio" ? (
                            <Database className="size-3" />
                          ) : (
                            <FileText className="size-3" />
                          )}
                          {doc.source === "minio" ? "MinIO" : "Upload"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            (STATUS_VARIANTS[doc.status] || "outline") as
                              | "default"
                              | "secondary"
                              | "destructive"
                              | "outline"
                          }
                          className="gap-1"
                        >
                          <StatusIcon status={doc.status} />
                          {doc.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span
                          className="text-sm text-muted-foreground"
                          title={
                            doc.created_at
                              ? new Date(doc.created_at).toLocaleString()
                              : undefined
                          }
                        >
                          {formatRelativeTime(doc.created_at)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        {pendingDelete?.id === doc.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(doc)}
                              disabled={isDeleting}
                              className="h-7 text-xs gap-1.5"
                            >
                              {isDeleting && (
                                <span className="size-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              )}
                              {isDeleting ? "Deleting..." : "Confirm"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPendingDelete(null)}
                              disabled={isDeleting}
                              className="h-7 text-xs"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setPendingDelete(doc)}
                            disabled={isDeleting}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                            <span className="sr-only">
                              Delete {doc.filename}
                            </span>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-muted-foreground">
                  Showing {(page - 1) * PER_PAGE + 1}–
                  {Math.min(page * PER_PAGE, totalCount)} of {totalCount}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="size-3.5" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => {
                      if (totalPages <= 5) return true;
                      if (p === 1 || p === totalPages) return true;
                      return Math.abs(p - page) <= 1;
                    })
                    .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                      if (idx > 0) {
                        const prev = arr[idx - 1];
                        if (p - prev > 1) acc.push("...");
                      }
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, idx) =>
                      p === "..." ? (
                        <span
                          key={`dots-${idx}`}
                          className="px-1 text-xs text-muted-foreground"
                        >
                          ...
                        </span>
                      ) : (
                        <Button
                          key={p}
                          variant={page === p ? "default" : "outline"}
                          size="icon-sm"
                          onClick={() => setPage(p as number)}
                          className="text-xs"
                        >
                          {p}
                        </Button>
                      )
                    )}
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
