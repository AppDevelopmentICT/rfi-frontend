"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Download,
  FileClock,
  FileSpreadsheet,
  FileText,
  Loader2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { getDashboardHistory, getDashboardStats } from "@/services/dashboard.service";
import {
  exportRfiExcel,
  listRfiDocuments,
  softDeleteRfiDocument,
  type RFIProjectResponse,
} from "@/services/rfi.service";
import {
  listRfiPdfs,
  softDeleteRfiPdf,
  type RFIPdfProjectResponse,
} from "@/services/rfi-pdf.service";
import {
  listMyRfpProjects,
  softDeleteRfpProject,
  type RFPProjectResponse,
} from "@/services/rfp.service";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RelativeTime } from "@/components/shared/RelativeTime";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ActionButtons } from "@/components/shared/ActionButtons";
import { cn } from "@/lib/utils";
import { formatAuditActionTitle } from "@/lib/audit-labels";
import { useStaleData } from "@/hooks/useStaleData";
import { useQueryClient } from "@tanstack/react-query";

type Tab = "rfi" | "rfp";

function getErrorMessage(error: unknown, fallback = "Request failed") {
  if (error instanceof Error) return error.message;
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: { data?: { detail?: unknown } } }).response
      ?.data?.detail === "string"
  ) {
    return String(
      (error as { response: { data: { detail: string } } }).response.data.detail
    );
  }
  return fallback;
}

export default function HomePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("rfi");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["dashboard-rfi-excel"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-rfi-pdf"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-rfp"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-history"] });
  }, [queryClient]);

  const { data: stats, isLoading: statsLoading } = useStaleData(
    "dashboard-stats",
    () => getDashboardStats().catch(() => ({
      total_rfi: 0,
      generated_rfi: 0,
      active_documents: 0,
    }))
  );

  const { data: history = [], isLoading: historyLoading } = useStaleData(
    "dashboard-history",
    () => getDashboardHistory(20).catch(() => [])
  );

  const { data: rawRfiDocs = [], isLoading: rfiLoading } = useStaleData(
    "dashboard-rfi-excel",
    () => listRfiDocuments().catch(() => [])
  );

  const { data: pdfDocs = [], isLoading: pdfLoading } = useStaleData(
    "dashboard-rfi-pdf",
    () => listRfiPdfs().catch(() => [])
  );

  const rfiCombined = useMemo(() => {
    const combined = [
      ...rawRfiDocs.map((d) => ({ ...d, type: "excel" as const })),
      ...pdfDocs.map((d) => ({ ...d, type: "pdf" as const })),
    ];
    combined.sort((a, b) => {
      const ta = new Date(a.updated_at || a.created_at || 0).getTime();
      const tb = new Date(b.updated_at || b.created_at || 0).getTime();
      return tb - ta;
    });
    return combined;
  }, [rawRfiDocs, pdfDocs]);

  const { data: rfpDocs = [] } = useStaleData(
    "dashboard-rfp",
    () => listMyRfpProjects().catch(() => [])
  );

  const isLoading = statsLoading || historyLoading || rfiLoading || pdfLoading;

  const sortedHistory = useMemo(
    () =>
      [...history].sort((a, b) =>
        (b.created_at || "").localeCompare(a.created_at || "")
      ),
    [history]
  );

  const handleDeleteRfi = async (doc: any) => {
    if (
      !window.confirm(
        `Move "${doc.fileName}" to Trash? Admins can restore it later.`
      )
    )
      return;
    setPendingDelete(`${doc.type}:${doc.documentId}`);
    try {
      if (doc.type === "pdf") {
        await softDeleteRfiPdf(doc.documentId);
      } else {
        await softDeleteRfiDocument(doc.documentId);
      }
      toast.success("Moved to Trash");
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPendingDelete(null);
    }
  };

  const handleDeleteRfp = async (doc: RFPProjectResponse) => {
    const label = doc.project_name || `${doc.product} – Chapter 3`;
    if (
      !window.confirm(`Move "${label}" to Trash? Admins can restore it later.`)
    )
      return;
    setPendingDelete(`rfp:${doc.documentId}`);
    try {
      await softDeleteRfpProject(doc.documentId);
      toast.success("Moved to Trash");
      refetch();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to delete RFP"));
    } finally {
      setPendingDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="animate-pulse text-muted-foreground">
          Loading dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4 sm:gap-6 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6 sm:py-6">
      <div className="shrink-0 flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight">
            Welcome back, {user?.name?.split(" ")[0] || "there"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review your generated RFI/RFP projects and recent activity.
          </p>
        </div>
        <ActionButtons buttonClassName="sm:!h-9 sm:!text-sm" />
      </div>

      <div className="grid shrink-0 gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total RFI"
          value={stats?.total_rfi || 0}
          description="Workbooks processed"
          icon={FileSpreadsheet}
        />
        <StatCard
          title="RFI Generated"
          value={stats?.generated_rfi || 0}
          description="Auto-filled and complete"
          icon={Sparkles}
        />
        <StatCard
          title="My RFP Projects"
          value={rfpDocs.length}
          description="Chapter 3 drafts"
          icon={FileText}
        />
        <StatCard
          title="Active Documents"
          value={stats?.active_documents || 0}
          description="Available in the system"
          icon={Activity}
        />
      </div>

      <div className="grid min-h-0 flex-1 gap-4 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="flex min-h-[280px] max-h-[480px] xl:max-h-none xl:min-h-0 flex-col border-border/70 shadow-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0 border-b py-3">
            <CardTitle className="flex items-center gap-2">
              {tab === "rfi" ? (
                <FileSpreadsheet className="size-5" />
              ) : (
                <FileText className="size-5" />
              )}
              Generated {tab === "rfi" ? "RFI" : "RFP"}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={tab === "rfi" ? "default" : "outline"}
                size="sm"
                className="gap-2"
                onClick={() => setTab("rfi")}
              >
                RFI
                <Badge variant="secondary" className="ml-1">
                  {rfiCombined.length}
                </Badge>
              </Button>
              <Button
                variant={tab === "rfp" ? "default" : "outline"}
                size="sm"
                className="gap-2"
                onClick={() => setTab("rfp")}
              >
                RFP
                <Badge variant="secondary" className="ml-1">
                  {rfpDocs.length}
                </Badge>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-auto p-0">
            {tab === "rfi" ? (
              rfiCombined.length === 0 ? (
                <div className="m-6 rounded-xl border border-dashed p-8 text-center">
                  <p className="font-medium">No generated RFI yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Upload a workbook and run auto-fill to see it here.
                  </p>
                  <Link href="/rfi/upload">
                    <Button className="mt-4">
                      Upload RFI
                    </Button>
                  </Link>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Filename</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rfiCombined.map((doc) => {
                      const deleting =
                        pendingDelete === `${doc.type}:${doc.documentId}`;
                      return (
                        <TableRow key={doc.documentId}>
                          <TableCell className="font-medium">
                            <Link
                              className="hover:underline"
                              href={doc.type === "pdf" ? `/rfi-pdf/${doc.documentId}` : `/rfi/${doc.documentId}`}
                            >
                              {doc.fileName}
                            </Link>
                          </TableCell>
                          <TableCell>
                            {doc.type === "pdf" ? (
                              <Badge variant="secondary" className="bg-blue-100/50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Documents</Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-emerald-100/50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Workbook</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={doc.status} />
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            <RelativeTime iso={doc.created_at} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Link href={doc.type === "pdf" ? `/rfi-pdf/${doc.documentId}` : `/rfi/${doc.documentId}`}>
                                <Button variant="outline" size="sm">
                                  Open
                                </Button>
                              </Link>
                              {doc.type === "excel" && (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  disabled={doc.status !== "completed"}
                                  onClick={() => exportRfiExcel(doc.documentId)}
                                >
                                  <Download className="size-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleDeleteRfi(doc)}
                                disabled={deleting}
                                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              >
                                {deleting ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <Trash2 className="size-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )
            ) : rfpDocs.length === 0 ? (
              <div className="m-6 rounded-xl border border-dashed p-8 text-center">
                <p className="font-medium">No RFP projects yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create an RFP to generate Chapter 3 product details with the
                  AI assistant.
                </p>
                <Link href="/rfp/upload">
                  <Button className="mt-4">
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
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rfpDocs.map((doc) => {
                    const label =
                      doc.project_name || `${doc.product} – Chapter 3`;
                    const deleting = pendingDelete === `rfp:${doc.documentId}`;
                    return (
                      <TableRow key={doc.documentId}>
                        <TableCell className="font-medium">
                          <Link
                            className="hover:underline"
                            href={`/rfp/${doc.documentId}`}
                          >
                            {label}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{doc.product}</Badge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={doc.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <RelativeTime
                            iso={doc.updated_at || doc.created_at}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Link href={`/rfp/${doc.documentId}`}>
                              <Button variant="outline" size="sm">
                                Open
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleDeleteRfp(doc)}
                              disabled={deleting}
                              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              {deleting ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Trash2 className="size-4" />
                              )}
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

        <Card className="flex min-h-[280px] max-h-[420px] xl:max-h-none xl:min-h-0 flex-col border-border/70 shadow-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0 border-b py-3">
            <CardTitle className="flex items-center gap-2">
              <FileClock className="size-5" />
              Activity History
            </CardTitle>
            <span className="text-xs text-muted-foreground">Newest first</span>
          </CardHeader>
          <CardContent className="scrollbar-thin min-h-0 flex-1 overflow-auto">
            {sortedHistory.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No activity found.
              </p>
            ) : (
              <div className="space-y-2">
                {sortedHistory.map((log) => {
                  const isUpload = log.action.includes("upload");
                  const isGenerate =
                    log.action.includes("autofill") ||
                    log.action.includes("generate") ||
                    log.action === "rfp.assistant";
                  const isUpdate =
                    log.action.includes("update") ||
                    log.action.includes("save");
                  const isDelete = log.action.includes("delete");
                  return (
                    <div
                      key={log.id}
                      className="flex items-center gap-3 rounded-lg border bg-card/50 p-3"
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/60">
                        {isUpload && log.resource_type === "rfi_pdf_project" ? (
                          <FileText className="size-4 text-slate-500 dark:text-slate-400" />
                        ) : isUpload ? (
                          <FileSpreadsheet className="size-4 text-slate-500 dark:text-slate-400" />
                        ) : isGenerate ? (
                          <Sparkles className="size-4 text-slate-500 dark:text-slate-400" />
                        ) : isUpdate ? (
                          <Activity className="size-4 text-slate-500 dark:text-slate-400" />
                        ) : isDelete ? (
                          <Trash2 className="size-4 text-slate-500 dark:text-slate-400" />
                        ) : (
                          <FileClock className="size-4 text-slate-400 dark:text-slate-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">
                            {(log.details?.filename as string | undefined) ||
                              (log.details?.project_name as string | undefined) ||
                              formatAuditActionTitle(log.action)}
                          </p>
                          {log.resource_type === "rfi_pdf_project" && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 bg-blue-100/50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                              Documents
                            </Badge>
                          )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          <span className="font-medium text-foreground/85">
                            {formatAuditActionTitle(log.action)}
                          </span>
                          <span className="font-mono text-muted-foreground"> · {log.action}</span>
                        </p>
                      </div>
                      <RelativeTime
                        iso={log.created_at}
                        className={cn("shrink-0 text-xs text-muted-foreground")}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
