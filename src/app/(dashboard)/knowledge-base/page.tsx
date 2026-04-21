"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  FileIcon,
  Trash2,
  RefreshCw,
  CloudDownload,
  Check,
  AlertCircle,
  Database,
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

const STATUS_VARIANTS: Record<string, string> = {
  completed: "default",
  processing: "secondary",
  failed: "destructive",
};

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<KBDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [pendingDelete, setPendingDelete] = useState<KBDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load documents from backend on mount
  const loadDocuments = useCallback(async () => {
    try {
      const response = await listKnowledgeDocuments();
      setDocuments(response.documents);
    } catch (error: any) {
      console.error("Failed to load documents:", error);
      toast.error("Failed to load knowledge base documents");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Handle file upload (manual ingest)
  const handleDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setIsUploading(true);
    let successCount = 0;

    for (const file of acceptedFiles) {
      try {
        await ingestKnowledgeDocument(file);
        successCount++;
        toast.success(`Vectorized ${file.name} successfully`);
      } catch (error: any) {
        toast.error(
          `Failed to ingest ${file.name}: ${error.message || "Unknown Error"}`
        );
      }
    }

    if (successCount > 0) {
      await loadDocuments(); // Refresh list
    }

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
      if (result.added.length > 0)
        parts.push(`+${result.added.length} added`);
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

      // Refresh document list
      await loadDocuments();
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
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      setPendingDelete(null);
      toast.success(`Deleted "${doc.filename}" and its vector chunks`);
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

        <Button
          id="sync-minio-btn"
          onClick={handleSync}
          disabled={isSyncing}
          variant="outline"
          className="group relative gap-2 overflow-hidden border-blue-500/30 text-blue-600 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-400/30 dark:text-blue-400 dark:hover:border-blue-400 dark:hover:bg-blue-950 dark:hover:text-blue-300 transition-all duration-300"
        >
          <RefreshCw
            className={`size-4 transition-transform duration-500 ${
              isSyncing ? "animate-spin" : "group-hover:rotate-90"
            }`}
          />
          {isSyncing ? "Syncing..." : "Sync from MinIO"}
          {!isSyncing && (
            <CloudDownload className="size-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
          )}
        </Button>
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
              {lastSyncResult.added.length > 0 || lastSyncResult.removed.length > 0 || lastSyncResult.updated.length > 0
                ? "Synced"
                : "Up to date"}
            </strong>
            {" — "}
            {lastSyncResult.added.length > 0 &&
              `${lastSyncResult.added.length} ingested`}
            {lastSyncResult.updated.length > 0 &&
              `${lastSyncResult.added.length > 0 || lastSyncResult.removed.length > 0 ? ", " : ""}${lastSyncResult.updated.length} re-ingested`}
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
        <h2 className="text-sm font-medium text-foreground">Upload Documents</h2>
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
          <div className="flex items-center gap-2 mt-2 text-sm text-blue-500 animate-pulse font-medium">
            <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
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
            {documents.length} file{documents.length !== 1 ? "s" : ""}
          </span>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/20 py-12 text-center">
            <RefreshCw className="mb-3 size-6 text-muted-foreground/40 animate-spin" />
            <p className="text-sm text-muted-foreground">
              Loading documents...
            </p>
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/20 py-12 text-center">
            <FileIcon className="mb-3 size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No documents in your knowledge base yet.
            </p>
            <p className="text-xs text-muted-foreground/70">
              Upload files above or sync from MinIO to get started.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-4">File Name</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
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
                          {doc.minio_key && doc.minio_key !== doc.filename && (
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
                          <CloudDownload className="size-3" />
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
                      >
                        {doc.status}
                      </Badge>
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
                          <span className="sr-only">Delete {doc.filename}</span>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
