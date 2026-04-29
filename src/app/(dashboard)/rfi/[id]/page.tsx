"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { FileClock, Lock, Sparkles } from "lucide-react";
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
    const interval = setInterval(() => {
      loadDocument().catch(() => {});
      loadTimeline().catch(() => {});
    }, 8000);
    return () => clearInterval(interval);
  }, [loadDocument, loadTimeline]);

  const lockMessage = useMemo(() => {
    if (!document?.is_locked_by_other || !document.editing_user) return null;
    const name = document.editing_user.name || document.editing_user.email;
    return `${name} is still updating the file. You can view it, but editing is disabled until they save changes.`;
  }, [document]);

  const handleBeginEdit = async () => {
    try {
      const locked = await lockRfiDocument(documentId);
      setDocument(locked);
      await loadTimeline();
      toast.success("Editing lock acquired.");
    } catch (e: unknown) {
      toast.error(errorMessage(e) || "This file is locked by another user.");
      await loadDocument();
    }
  };

  const handleSave = async () => {
    if (!excelData) return;
    const saved = await saveRfiDocument(documentId, excelData);
    setDocument(saved);
    await loadTimeline();
  };

  const handleCancel = async () => {
    const unlocked = await unlockRfiDocument(documentId);
    setDocument(unlocked);
    await loadDocument();
    await loadTimeline();
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
                        <Lock className="size-4 text-amber-600" />
                      ) : isGenerate ? (
                        <Sparkles className="size-4 text-purple-600" />
                      ) : (
                        <FileClock className="size-4 text-primary" />
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
