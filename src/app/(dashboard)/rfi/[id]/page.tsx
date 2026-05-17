"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

function isAuthError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === "object" &&
    "response" in error &&
    (error as { response?: { status?: number } }).response?.status === 401
  );
}

const FINAL_STATUSES = new Set(["completed", "failed"]);

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
  const [isRegenerating, setIsRegenerating] = useState(false);

  const pollingStoppedRef = useRef(false);
  const fetchInFlightRef = useRef(false);

  const activeJobs = useRFIStore((s) => s.activeJobs);
  const isGenerating = document?.status === "generating" || activeJobs.some((j) => j.id === documentId && j.status === "generating");

  const isGeneratingRef = useRef(isGenerating);
  const isRegeneratingRef = useRef(isRegenerating);

  useEffect(() => {
    isGeneratingRef.current = isGenerating;
    isRegeneratingRef.current = isRegenerating;
  }, [isGenerating, isRegenerating]);

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

  useEffect(() => {
    if (isRegenerating) return;

    if (isGenerating) {
      pollingStoppedRef.current = false;
    }

    let stopped = false;
    const intervalMs = isGenerating ? 5000 : 30000;

    console.debug(`[Polling:page] start doc=${documentId} interval=${intervalMs}ms generating=${isGenerating}`);

    const interval = setInterval(async () => {
      if (stopped || pollingStoppedRef.current) return;
      if (isRegeneratingRef.current) return;
      if (fetchInFlightRef.current) return;
      if (globalThis.document?.visibilityState !== "visible") return;

      fetchInFlightRef.current = true;
      try {
        const doc = await getRfiDocument(documentId);
        if (stopped) return;

        setDocument(doc);
        if (!doc.is_lock_held_by_me && doc.excelData) {
          setExcelData(doc.excelData);
        }

        const currentlyGenerating = isGeneratingRef.current;
        if (currentlyGenerating && FINAL_STATUSES.has(doc.status)) {
          const rfiStore = useRFIStore.getState();
          const matchingJob = rfiStore.activeJobs.find((j) => j.id === documentId);
          if (matchingJob) {
            rfiStore.updateJob(documentId, doc.status);
          }
          loadTimeline().catch(() => {});

          if (doc.status === "completed") {
            toast.success("Workbook filled successfully!");
          } else {
            toast.error("Workbook generation failed.");
          }

          pollingStoppedRef.current = true;
          console.debug(`[Polling:page] stopped — status=${doc.status}`);
          clearInterval(interval);
        } else if (!currentlyGenerating) {
          loadTimeline().catch(() => {});
        }
      } catch (err) {
        if (isAuthError(err)) {
          pollingStoppedRef.current = true;
          console.warn("[Polling:page] stopped — 401");
          clearInterval(interval);
          return;
        }
      } finally {
        fetchInFlightRef.current = false;
      }
    }, intervalMs);

    return () => {
      stopped = true;
      clearInterval(interval);
      console.debug(`[Polling:page] cleanup doc=${documentId}`);
    };
  }, [documentId, isGenerating, isRegenerating, loadTimeline, setExcelData]);

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
          onRegeneratingChange={setIsRegenerating}
        />
      </div>

      <div className="hidden flex-col gap-4 lg:flex">
        {document && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <FileClock className="size-4 text-muted-foreground" />
                Document Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={document.status} />
              </div>
              {document.is_locked_by_other && document.editing_user && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Locked by</span>
                  <UserPill name={document.editing_user?.name} email={document.editing_user?.email} />
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">File</span>
                <span className="max-w-[200px] truncate font-mono text-xs">
                  {document.fileName || document.filename}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Created</span>
                <RelativeTime iso={document.created_at} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last updated</span>
                <RelativeTime iso={document.updated_at} />
              </div>
            </CardContent>
          </Card>
        )}

        {document && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Lock className="size-4 text-muted-foreground" />
                Lock Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {document.is_lock_held_by_me ? (
                <div className="flex items-center gap-2 text-emerald-600">
                  <Lock className="size-3.5" />
                  You are editing this document
                </div>
              ) : document.is_locked_by_other ? (
                <div className="flex items-center gap-2 text-amber-600">
                  <Lock className="size-3.5" />
                  <span>
                    Locked by{" "}
                    <UserPill name={document.editing_user?.name} email={document.editing_user?.email} />
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Lock className="size-3.5" />
                  No active lock
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Uploaded by</span>
                {document.user || document.uploaded_by ? (
                  <UserPill name={(document.user || document.uploaded_by!)?.name} email={(document.user || document.uploaded_by!)?.email} />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {timeline.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Zap className="size-4 text-muted-foreground" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-64 space-y-3 overflow-y-auto">
              {timeline.slice(0, 20).map((entry, i) => (
                <div key={entry.id ?? i} className="flex items-start gap-3 text-sm">
                  <div className="mt-1 size-2 shrink-0 rounded-full bg-border" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{entry.action}</span>
                      <span className="text-xs text-muted-foreground">
                         <RelativeTime iso={entry.created_at} />
                      </span>
                    </div>
                    {entry.user && (
                      <span className="text-xs text-muted-foreground">
                         by <UserPill name={entry.user?.name} email={entry.user?.email} />
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
