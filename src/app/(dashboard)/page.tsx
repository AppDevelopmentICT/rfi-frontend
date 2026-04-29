"use client";

import { useEffect, useState } from "react";
import { getDashboardStats, getDashboardHistory, DashboardStats, AuditLogEntry } from "@/services/dashboard.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSpreadsheet, Activity, Sparkles, FileClock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [history, setHistory] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsData, historyData] = await Promise.all([
          getDashboardStats(),
          getDashboardHistory()
        ]);
        setStats(statsData);
        setHistory(historyData);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted-foreground animate-pulse">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 p-8 max-w-6xl mx-auto w-full">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border-none shadow-md transition-all hover:shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-200">Total RFI Uploaded</CardTitle>
            <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/30">
              <FileSpreadsheet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-blue-950 dark:text-blue-100">{stats?.total_rfi || 0}</div>
            <p className="text-xs font-medium text-blue-600/70 mt-1 dark:text-blue-400/70">Original files uploaded</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-none shadow-md transition-all hover:shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-transparent pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-900 dark:text-purple-200">RFI Generated</CardTitle>
            <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900/30">
              <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-purple-950 dark:text-purple-100">{stats?.generated_rfi || 0}</div>
            <p className="text-xs font-medium text-purple-600/70 mt-1 dark:text-purple-400/70">Auto-filled responses</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-none shadow-md transition-all hover:shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-900 dark:text-emerald-200">Active Documents</CardTitle>
            <div className="rounded-full bg-emerald-100 p-2 dark:bg-emerald-900/30">
              <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-emerald-950 dark:text-emerald-100">{stats?.active_documents || 0}</div>
            <p className="text-xs font-medium text-emerald-600/70 mt-1 dark:text-emerald-400/70">Documents in the system</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileClock className="h-5 w-5" /> Activity History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No activity found.</p>
            ) : (
              <div className="space-y-6">
                {history.map((log) => {
                  const isAuth = log.action.includes("auth");
                  const isUpload = log.action.includes("upload");
                  const isGenerate = log.action.includes("autofill");
                  const isUpdate = log.action.includes("update");
                  const isExport = log.action.includes("export");
                  
                  return (
                    <div key={log.id} className="flex items-center group rounded-lg p-2 transition-colors hover:bg-muted/50">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        {isAuth && <Activity className="h-4 w-4 text-primary" />}
                        {isUpload && <FileSpreadsheet className="h-4 w-4 text-blue-500" />}
                        {isGenerate && <Sparkles className="h-4 w-4 text-purple-500" />}
                        {isUpdate && <Activity className="h-4 w-4 text-emerald-500" />}
                        {isExport && <FileSpreadsheet className="h-4 w-4 text-green-500" />}
                        {(!isAuth && !isUpload && !isGenerate && !isUpdate && !isExport) && <FileClock className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <div className="ml-4 space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium leading-none truncate">
                            {log.details?.filename ? log.details.filename : `System Resource`}
                          </p>
                          <Badge 
                            variant="secondary" 
                            className={cn("text-[10px] px-1.5 py-0 uppercase tracking-wider", 
                              isAuth && "bg-slate-100 text-slate-700 hover:bg-slate-100 border-slate-200",
                              isUpload && "bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200",
                              isGenerate && "bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200",
                              isUpdate && "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200",
                              isExport && "bg-green-100 text-green-700 hover:bg-green-100 border-green-200"
                            )}
                          >
                            {log.action.replace("rfi.", "").replace("_", " ")}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {log.resource_type === "user" ? "User authentication event" : "Document modified"}
                        </p>
                      </div>
                      <div className="ml-auto font-medium text-xs text-muted-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </div>
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
