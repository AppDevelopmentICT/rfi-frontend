"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useRFIStore } from "@/store/useRFIStore";
import { useExcelStore } from "@/store/useExcelStore";
import { EditorHeader } from "@/components/editor/EditorHeader";
import { ExcelTable } from "@/components/editor/ExcelTable";
import { useAutoFillMutation, useRegenerateRfiRowMutation } from "@/hooks/useRFIQueries";
import { exportRfiExcel } from "@/services/rfi.service";
import { useState } from "react";
import type { RFIProjectResponse } from "@/services/rfi.service";

interface RFIEditorProps {
  rfiId: string;
  document?: RFIProjectResponse | null;
  readOnly?: boolean;
  lockMessage?: string | null;
  isEditing?: boolean;
  isLockedByOther?: boolean;
  canForceUnlock?: boolean;
  onBeginEdit?: () => Promise<void> | void;
  onSaveChanges?: () => Promise<void> | void;
  onCancelEdit?: () => Promise<void> | void;
  onForceUnlock?: () => Promise<void> | void;
}

export function RFIEditor({
  rfiId,
  document,
  readOnly = false,
  lockMessage,
  isEditing = false,
  isLockedByOther = false,
  canForceUnlock = false,
  onBeginEdit,
  onSaveChanges,
  onCancelEdit,
  onForceUnlock,
}: RFIEditorProps) {
  const router = useRouter();
  const file = useRFIStore((s) => s.file);
  const fileBase64 = useRFIStore((s) => s.fileBase64);
  const fileName = useRFIStore((s) => s.fileName);
  const setExcelData = useExcelStore((s) => s.setExcelData);
  const activeJobs = useRFIStore((s) => s.activeJobs);

  // Find latest job for this file
  const activeJob = activeJobs.slice().reverse().find(j => j.filename.startsWith(fileName.replace(/\.[^.]+$/, "")));
  
  const { mutate, isPending } = useAutoFillMutation();
  const regenerateRowMutation = useRegenerateRfiRowMutation();
  const [isExporting, setIsExporting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [regeneratingRows, setRegeneratingRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const handleAutoFillExcel = useCallback(async () => {
    let uploadFile = file;
    
    if (!uploadFile && fileBase64 && fileName) {
      try {
        const res = await fetch(fileBase64);
        const blob = await res.blob();
        uploadFile = new File([blob], fileName, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      } catch {
        console.error("Failed to reconstruct file from base64");
      }
    }

    if (!uploadFile) {
      toast.error(
        "Original workbook is unavailable. Go back to upload and open the file again."
      );
      return;
    }

    mutate(
      { file: uploadFile },
      {
        onSuccess: (data) => {
          if (data.excelData) {
            setExcelData(data.excelData);
          }
          if (data.documentId) {
            router.push(`/rfi/${data.documentId}`);
          }
        }
      }
    );
  }, [file, fileBase64, fileName, mutate, router, setExcelData]);

  const handleSave = useCallback(async () => {
    if (!onSaveChanges) return;
    try {
      setIsSaving(true);
      await onSaveChanges();
      setIsDirty(false);
      toast.success("Changes saved.");
    } catch {
      toast.error("Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  }, [onSaveChanges]);

  const handleExport = useCallback(async () => {
    const docId = document?.documentId || activeJob?.id;
    if (!docId) {
      toast.error("You must auto-fill the document first before exporting.");
      return;
    }
    try {
      setIsExporting(true);
      await exportRfiExcel(docId);
    } catch {
      toast.error("Failed to export Excel.");
    } finally {
      setIsExporting(false);
    }
  }, [activeJob?.id, document?.documentId]);

  const handleRegenerateRow = useCallback(
    (sheet: string, rowIdx: number) => {
      const docId = document?.documentId || activeJob?.id;
      if (!docId) {
        toast.error("Document not ready for regeneration.");
        return;
      }

      setRegeneratingRows((prev) => new Set(prev).add(rowIdx));

      regenerateRowMutation.mutate(
        { documentId: docId, sheet, rowIdx },
        {
          onSuccess: (result) => {
            const excelStore = useExcelStore.getState();
            for (const [col, val] of Object.entries(result.updatedRow)) {
              excelStore.updateCell(sheet, rowIdx, col, String(val));
            }
            setRegeneratingRows((prev) => {
              const next = new Set(prev);
              next.delete(rowIdx);
              return next;
            });
            setIsDirty(true);
            toast.success("Answer regenerated.");
          },
          onError: () => {
            setRegeneratingRows((prev) => {
              const next = new Set(prev);
              next.delete(rowIdx);
              return next;
            });
          },
        }
      );
    },
    [document?.documentId, activeJob?.id, regenerateRowMutation]
  );

  const handleRegenerateAll = useCallback(async () => {
    let uploadFile = file;

    if (!uploadFile && fileBase64 && fileName) {
      try {
        const res = await fetch(fileBase64);
        const blob = await res.blob();
        uploadFile = new File([blob], fileName, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      } catch {
        console.error("Failed to reconstruct file from base64");
      }
    }

    if (!uploadFile) {
      toast.error("Original workbook is unavailable. Go back to upload and open the file again.");
      return;
    }

    mutate(
      { file: uploadFile },
      {
        onSuccess: (data) => {
          if (data.excelData) {
            setExcelData(data.excelData);
          }
          if (data.documentId) {
            router.push(`/rfi/${data.documentId}`);
          }
        },
      }
    );
  }, [file, fileBase64, fileName, mutate, router, setExcelData]);

  const displayTitle = document?.fileName || activeJob?.filename || fileName || rfiId;
  const isGenerating = isPending || activeJob?.status === "generating" || document?.status === "generating";
  const isCompleted = activeJob?.status === "completed" || document?.status === "completed";
  const shouldShowGenerate = !document;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-muted/40" style={{ height: "calc(100dvh - 3.5rem)" }}>
      <EditorHeader
        title={`RFI Project - ${displayTitle}`}
        questionCount={0}
        isGeneratingAll={isGenerating || isExporting || isSaving}
        generateAllLabel="Auto-fill Excel"
        generatingLabel={isSaving ? "Saving..." : isExporting ? "Exporting..." : "Filling workbook..."}
        onGenerateAll={handleAutoFillExcel}
        onSave={handleSave}
        onEdit={onBeginEdit}
        onCancel={onCancelEdit}
        onForceUnlock={canForceUnlock ? onForceUnlock : undefined}
        onExport={handleExport}
        onRegenerateAll={isCompleted ? handleRegenerateAll : undefined}
        showGenerate={shouldShowGenerate}
        isEditing={isEditing}
        isDirty={isDirty}
        isLockedByOther={isLockedByOther}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="w-full">
          {lockMessage && (
            <div className="sticky top-0 z-10 m-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-sm">
              <div className="font-semibold">Editing locked</div>
              <p className="mt-1">{lockMessage}</p>
            </div>
          )}
          {isEditing && (
            <div className="m-6 rounded-lg border border-border/60 bg-[#f8fafc] p-4 text-sm text-slate-700 shadow-sm">
              <div className="font-semibold">You are editing this file</div>
              <p className="mt-1 text-slate-500">Other users cannot edit it until you click Save Changes or Cancel.</p>
            </div>
          )}
          {(!isCompleted && !isGenerating && !file && !fileBase64) && (
            <div className="rounded-lg border bg-background p-6 shadow-sm mb-6 m-6">
              <h2 className="text-base font-semibold">Ready to generate Excel response</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Review your Excel data below. Click &quot;Auto-fill Excel&quot; to generate the answers.
              </p>
            </div>
          )}
          {isGenerating && (
            <div className="rounded-lg border border-border/60 bg-[#f8fafc] p-4 shadow-sm mb-6 m-6 flex items-center gap-4">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-slate-300 opacity-40" />
                <span className="relative inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-400">
                  <span className="block h-1.5 w-1.5 rounded-full bg-white" />
                </span>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-700">Generating answers...</h2>
                <p className="text-xs text-slate-500">Your workbook is being processed in the background. You can leave and come back anytime.</p>
              </div>
            </div>
          )}
          {isCompleted && (
            <div className="rounded-lg border border-border/60 bg-[#f8fafc] p-4 shadow-sm mb-6 m-6 flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100">
                <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-700">Workbook filled successfully</h2>
                <p className="text-xs text-slate-500">You can now review and export your responses.</p>
              </div>
            </div>
          )}
          {activeJob?.status === "failed" && (
            <div className="rounded-lg border border-red-200 bg-red-50/50 p-4 shadow-sm mb-6 m-6 flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-red-900">Generation failed</h2>
                <p className="text-xs text-red-700">Something went wrong. Try uploading again or contact support.</p>
              </div>
            </div>
          )}
          
          <ExcelTable
            isGenerated={isCompleted}
            readOnly={readOnly}
            regeneratingRows={regeneratingRows}
            onDirtyChange={setIsDirty}
            onRegenerateRow={handleRegenerateRow}
          />
        </div>
      </div>
    </div>
  );
}
