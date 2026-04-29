"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, Download, FileClock, FileSpreadsheet, Sparkles } from "lucide-react";

import {
  getDashboardHistory,
  getDashboardStats,
  type AuditLogEntry,
  type DashboardStats,
} from "@/services/dashboard.service";
import {
  exportRfiExcel,
  listMyRfiDocuments,
  type RFIProjectResponse,
} from "@/services/rfi.service";
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
import { RelativeTime } from "@/components/shared/RelativeTime";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [history, setHistory] = useState<AuditLogEntry[]>([]);
  const [documents, setDocuments] = useState<RFIProjectResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsData, historyData, docsData] = await Promise.all([
          getDashboardStats(),
          getDashboardHistory(),
          listMyRfiDocuments(),
        ]);
        setStats(statsData);
        setHistory(historyData);
        setDocuments(docsData);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="animate-pulse text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review your generated RFI documents and recent activity.
          </p>
        </div>
        <Link href="/rfi/upload">
          <Button>Upload RFI</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Total RFI Uploaded"
          value={stats?.total_rfi || 0}
          description="Files processed by your account"
          icon={FileSpreadsheet}
        />
        <StatCard
          title="RFI Generated"
          value={stats?.generated_rfi || 0}
          description="Completed auto-filled workbooks"
          icon={Sparkles}
        />
        <StatCard
          title="Active Documents"
          value={stats?.active_documents || 0}
          description="Documents available in the system"
          icon={Activity}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="size-5" />
              My Generated RFI
            </CardTitle>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <p className="font-medium">No generated RFI yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Upload a workbook and run auto-fill to see it here.
                </p>
                <Link href="/rfi/upload">
                  <Button className="mt-4" size="sm">Upload RFI</Button>
                </Link>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Filename</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.documentId}>
                      <TableCell className="font-medium">
                        <Link className="hover:underline" href={`/rfi/${doc.documentId}`}>
                          {doc.fileName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={doc.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <RelativeTime iso={doc.created_at} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/rfi/${doc.documentId}`}>
                            <Button variant="outline" size="sm">Open</Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={doc.status !== "completed"}
                            onClick={() => exportRfiExcel(doc.documentId)}
                          >
                            <Download className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileClock className="size-5" />
              Activity History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No activity found.</p>
            ) : (
              <div className="space-y-2">
                {history.map((log) => {
                  const isUpload = log.action.includes("upload");
                  const isGenerate = log.action.includes("autofill") || log.action.includes("generate");
                  const isUpdate = log.action.includes("update") || log.action.includes("save");
                  return (
                    <div
                      key={log.id}
                      className="flex items-center gap-3 rounded-lg border bg-card/50 p-3"
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        {isUpload ? (
                          <FileSpreadsheet className="size-4 text-blue-600" />
                        ) : isGenerate ? (
                          <Sparkles className="size-4 text-purple-600" />
                        ) : isUpdate ? (
                          <Activity className="size-4 text-emerald-600" />
                        ) : (
                          <FileClock className="size-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {log.details?.filename || log.action.replace("rfi.", "RFI ")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {log.action.replace("rfi.", "").replace(/_/g, " ")}
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
