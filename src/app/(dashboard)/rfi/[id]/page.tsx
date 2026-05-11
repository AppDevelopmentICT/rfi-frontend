"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { FileClock, Lock, Zap } from "lucide-react";
import { toast } from "sonner";

import { RFIEditor } from "@/components/editor/RFIEditor";
import { RelativeTime } from "@/components/shared/RelativeTime";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { UserPill } from "@/components/shared/UserPill";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import {
  getRfiDocument,
  getRfiTimeline,
  lockRfiDocument,
  saveRfiDocument,
  unlockRfiDocument,
  type RFIProjectResponse,
  type RFITimelineEntry,
} from "@/services/rfi.service";
import { useExcelStore } from "@/store/useExcelStore";
import { useRFIStore } from "@/store/useRFIStore";
import { useJobPolling } from "@/hooks/usePollingManager";

function errorMessage(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response
  ) {
    const data = error.response.data as {
      error?: { message?: string };
      detail?: string;
    };
    return data.error?.message || data.detail;
  }
  return undefined;
}

export default function RfiDetailPage() {
  const params = useParams<{ id: string }>();
  const documentId = params.id;
  const { user } = useAuth();
  const excelData = useExcelStore((s) => s.excelData);
  const setExcelData = useExcelStore((s) => s.setExcelData);
  const [document, setDocument] = useState<RFIProjectResponse | null>(null);
  const [timeline, setTimeline] = useState<RFITimelineEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocking, setIsLocking] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const loadDocument = useCallback(async () => {
    const data = await getRfiDocument(documentId);
    setDocument(data);
    if (data.excelData) {
      setExcelData(data.excelData);
    }
  }, [documentId, setExcelData]);

  const loadTimeline = useCallback(async () => {
    setTimeline(await getRfiTimeline(documentId));
  }, [documentId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setIsLoading(true);
        const [docData, timelineData] = await Promise.all([
          getRfiDocument(documentId),
          getRfiTimeline(documentId),
        ]);
        if (cancelled) return;
        setDocument(docData);
        setTimeline(timelineData);
        if (docData.excelData) {
          setExcelData(docData.excelData);
        }
      } catch {
        toast.error("Failed to load RFI document.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [documentId, setExcelData]);

  // Poll for background generation completion
  useJobPolling(
    document?.status === "generating" ? documentId : "",
    5000,
    // onComplete
    (doc) => {
      const rfiDoc = doc as RFIProjectResponse;
      setDocument(rfiDoc);
      if (rfiDoc.excelData) {
        setExcelData(rfiDoc.excelData);
      }
      // Clear the activeJob from Zustand store so isGenerating becomes false
      const rfiStore = useRFIStore.getState();
      const matchingJob = rfiStore.activeJobs.find(j => j.id === documentId);
      if (matchingJob) {
        rfiStore.updateJob(documentId, "completed");
      }
      loadTimeline().catch(() => {});
      toast.success("Workbook filled successfully!");
    },
    // onFailed
    () => {
      const rfiStore = useRFIStore.getState();
      const matchingJob = rfiStore.activeJobs.find(j => j.id === documentId);
      if (matchingJob) {
        rfiStore.updateJob(documentId, "failed");
      }
      loadDocument().catch(() => {});
      toast.error("Workbook generation failed.");
    }
  );

  useEffect(() => {
    const interval = setInterval(() => {
      if (globalThis.document.visibilityState !== "visible") return;
      // During edit mode, only refresh document metadata (lock status, etc.)
      // Do NOT overwrite excelData — the user may have unsaved local edits.
      getRfiDocument(documentId)
        .then((data) => {
          setDocument(data);
          if (!data.is_lock_held_by_me && data.excelData) {
            setExcelData(data.excelData);
          }
        })
        .catch(() => {});
      // Only refresh timeline when not editing (it's not useful during editing)
      if (!document?.is_lock_held_by_me) {
        loadTimeline().catch(() => {});
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [documentId, setExcelData, loadTimeline, document?.is_lock_held_by_me]);

  const lockMessage = useMemo(() => {
    if (!document?.is_locked_by_other || !document.editing_user) return null;
    const name = document.editing_user.name || document.editing_user.email;
    return `${name} is still updating the file. You can view it, but editing is disabled until they save changes.`;
  }, [document]);

  const handleBeginEdit = async () => {
    setIsLocking(true);
    try {
      const locked = await lockRfiDocument(documentId);
      setDocument(locked);
      await loadTimeline();
      toast.success("Editing lock acquired.");
    } catch (e: unknown) {
      toast.error(errorMessage(e) || "This file is locked by another user.");
      await loadDocument();
    } finally {
      setIsLocking(false);
    }
  };

  const handleSave = async () => {
    if (!excelData) return;
    const saved = await saveRfiDocument(documentId, excelData);
    setDocument(saved);
    await loadTimeline();
  };

  const handleCancel = async () => {
    setIsUnlocking(true);
    try {
      await unlockRfiDocument(documentId);
      // Parallelize refresh calls since they are independent
      const [docData] = await Promise.all([
        getRfiDocument(documentId),
        loadTimeline(),
      ]);
      setDocument(docData);
      if (docData.excelData) {
        setExcelData(docData.excelData);
      }
    } catch {
      toast.error("Failed to cancel edit.");
    } finally {
      setIsUnlocking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
        Loading document...
      </div>
    );
  }

  return (
    <div className="grid h-full gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 overflow-hidden rounded-xl border bg-background shadow-sm">
        <RFIEditor
          rfiId={documentId}
          document={document}
          readOnly={!document?.is_lock_held_by_me}
          isEditing={!!document?.is_lock_held_by_me}
          isLockedByOther={!!document?.is_locked_by_other}
          lockMessage={lockMessage}
          canForceUnlock={!!user?.is_admin && !!document?.is_locked_by_other}
          isLocking={isLocking}
          isUnlocking={isUnlocking}
          onBeginEdit={document?.status === "completed" ? handleBeginEdit : undefined}
          onSaveChanges={handleSave}
          onCancelEdit={handleCancel}
          onForceUnlock={handleCancel}
        />
      </div>

      <Card className="h-full overflow-hidden border-border/70 shadow-sm">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileClock className="size-4" />
            Document Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[calc(100%-4rem)] overflow-y-auto p-4">
          {timeline.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No timeline activity yet.
            </p>
          ) : (
            <div className="space-y-4">
              {timeline.map((entry) => {
                const isLock = entry.action.includes("lock");
                const isGenerate = entry.action.includes("autofill") || entry.action.includes("generate");
                return (
                  <div key={entry.id} className="relative pl-8">
                    <span className="absolute left-2 top-2 h-full w-px bg-border" />
                    <span className="absolute left-0 top-1 flex size-4 items-center justify-center rounded-full bg-background ring-4 ring-background">
                      {isLock ? (
                        <Lock className="size-3 text-muted-foreground" />
                      ) : isGenerate ? (
                        <Zap className="size-3 text-muted-foreground" />
                      ) : (
                        <FileClock className="size-3 text-muted-foreground" />
                      )}
                    </span>
                    <div className="rounded-lg border bg-card p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <StatusBadge status={entry.action.replace("rfi.", "")} />
                          <p className="mt-2 text-sm font-medium">
                            {entry.action.replace("rfi.", "RFI ").replace(/_/g, " ")}
                          </p>
                        </div>
                        <RelativeTime iso={entry.created_at} className="shrink-0 text-xs text-muted-foreground" />
                      </div>
                      <UserPill
                        className="mt-3"
                        name={entry.user?.name}
                        email={entry.user?.email}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
