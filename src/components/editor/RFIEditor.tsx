"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useRFIStore } from "@/store/useRFIStore";
import { useExcelStore } from "@/store/useExcelStore";
import { EditorHeader } from "@/components/editor/EditorHeader";
import { ExcelTable } from "@/components/editor/ExcelTable";
import { useAutoFillMutation, useRegenerateRfiRowMutation } from "@/hooks/useRFIQueries";
import { exportRfiExcel, regenerateRfiRow } from "@/services/rfi.service";
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
  isLocking?: boolean;
  isUnlocking?: boolean;
  onBeginEdit?: () => Promise<void> | void;
  onSaveChanges?: () => Promise<void> | void;
  onCancelEdit?: () => Promise<void> | void;
  onForceUnlock?: () => Promise<void> | void;
  onRegeneratingChange?: (isRegenerating: boolean) => void;
}

export function RFIEditor({
  rfiId,
  document,
  readOnly = false,
  lockMessage,
  isEditing = false,
  isLockedByOther = false,
  canForceUnlock = false,
  isLocking = false,
  isUnlocking = false,
  onBeginEdit,
  onSaveChanges,
  onCancelEdit,
  onForceUnlock,
  onRegeneratingChange,
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
  // BUG 3 FIX: Dedicated flag for the "Regenerate All" flow. We cannot reuse
  // the auto-fill mutation's `isPending` because the parent gates `isGenerating`
  // on `!isCompleted`, which makes the loading state invisible once the
  // workbook has already been generated (which is exactly when this button
  // is shown).
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regeneratingRows, setRegeneratingRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    // Treat both per-row regeneration AND the full "Regenerate All" flow as
    // "regenerating" so the parent page can keep the lock/edit UI coherent.
    onRegeneratingChange?.(regeneratingRows.size > 0 || isRegenerating);
  }, [regeneratingRows.size, isRegenerating, onRegeneratingChange]);

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

      // Read the current row data from ExcelStore so regenerate uses the latest edited values
      const excelState = useExcelStore.getState();
      const sheetData = excelState.excelData?.[sheet];
      const currentRow = sheetData?.data?.[rowIdx] as Record<string, string> | undefined;

      setRegeneratingRows((prev) => new Set(prev).add(rowIdx));

      regenerateRowMutation.mutate(
        { documentId: docId, sheet, rowIdx, currentRow },
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
    // BUG 3 FIX: Mark the regeneration in-flight so the header button can
    // disable itself and show a spinner for the entire duration (save + loop).
    if (isRegenerating) return;

    const docId = document?.documentId || activeJob?.id;
    if (!docId) {
      toast.error("Document not ready for regeneration.");
      return;
    }

    setIsRegenerating(true);

    try {
      // BUG 2 FIX (part 1): Flush local edits BEFORE regenerating so the
      // backend reads the user's latest edited questions from the DB. The
      // /regenerate-row endpoint merges `currentRow` from the request on top
      // of `doc.json_data`, but `context_columns` may live in other rows /
      // sheets that we don't send per-call — so a real save is required for
      // correctness.
      if (isDirty && onSaveChanges) {
        try {
          setIsSaving(true);
          await onSaveChanges();
          setIsDirty(false);
        } catch {
          toast.error("Failed to save pending edits before regenerating.");
          return;
        } finally {
          setIsSaving(false);
        }
      }

      // BUG 2 FIX (part 2): Mirror the WORKING single-row flow. There is no
      // backend `regenerate-all` endpoint — the old code called `/auto-fill`
      // with the ORIGINAL uploaded file, which (a) ignored the saved/edited
      // questions, and (b) created a brand-new document, throwing away the
      // current one. Instead, we now loop over every visible sheet/row and
      // reuse the same `/regenerate-row` endpoint that already works
      // correctly for single rows. Same payload shape, same response
      // handling, same state updates -> same correct behaviour.
      const excelStateBefore = useExcelStore.getState();
      const excelData = excelStateBefore.excelData;
      if (!excelData) {
        toast.error("No workbook data is loaded.");
        return;
      }

      // Exclude internal sheets (e.g. "_column_info") just like the UI does.
      const visibleSheets = Object.keys(excelData).filter(
        (name) => !name.startsWith("_")
      );

      let totalRegenerated = 0;
      let totalFailed = 0;

      for (const sheet of visibleSheets) {
        const rows = excelData[sheet]?.data ?? [];
        for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
          // Re-read the row from the store at iteration time so the request
          // includes the latest cell values (matches single-row regen logic
          // exactly).
          const liveState = useExcelStore.getState();
          const currentRow = liveState.excelData?.[sheet]?.data?.[rowIdx] as
            | Record<string, string>
            | undefined;

          // Show per-row spinner for visual feedback during the loop.
          setRegeneratingRows((prev) => new Set(prev).add(rowIdx));

          try {
            // NOTE: We call the service function directly (not
            // `regenerateRowMutation.mutateAsync`) to bypass the mutation's
            // global `onError` toast — otherwise every empty/header row that
            // legitimately returns 400 would spam the user with error toasts.
            const result = await regenerateRfiRow(docId, sheet, rowIdx, currentRow);
            // Same cell-by-cell update as the working single-row handler.
            const store = useExcelStore.getState();
            for (const [col, val] of Object.entries(result.updatedRow)) {
              store.updateCell(sheet, rowIdx, col, String(val));
            }
            totalRegenerated++;
          } catch (err) {
            // Backend returns 400 "No data found in this row to regenerate
            // from" for empty/header rows — that's expected, just skip it.
            console.warn(`Regenerate skipped sheet=${sheet} row=${rowIdx}`, err);
            totalFailed++;
          } finally {
            setRegeneratingRows((prev) => {
              const next = new Set(prev);
              next.delete(rowIdx);
              return next;
            });
          }
        }
      }

      if (totalRegenerated > 0) {
        // Mark the workbook dirty so the user can save the freshly
        // regenerated answers, mirroring the single-row flow.
        setIsDirty(true);
        toast.success(
          totalFailed > 0
            ? `Regenerated ${totalRegenerated} rows (${totalFailed} skipped).`
            : `Regenerated ${totalRegenerated} rows.`
        );
      } else {
        toast.error("No rows could be regenerated.");
      }
    } catch (err) {
      console.error("Regenerate all failed", err);
      toast.error("Failed to regenerate answers.");
    } finally {
      // Clear any per-row spinners that might still be set if we threw mid-loop.
      setRegeneratingRows(new Set());
      setIsRegenerating(false);
    }
  }, [
    isRegenerating,
    isDirty,
    onSaveChanges,
    document?.documentId,
    activeJob?.id,
  ]);

  const displayTitle = document?.fileName || activeJob?.filename || fileName || rfiId;
  const isCompleted = activeJob?.status === "completed" || document?.status === "completed";
  const isGenerating = !isCompleted && (isPending || activeJob?.status === "generating" || document?.status === "generating");
  const shouldShowGenerate = !document;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-muted/40" style={{ height: "calc(100dvh - 3.5rem)" }}>
      <EditorHeader
        title={`RFI Project - ${displayTitle}`}
        questionCount={0}
        isGeneratingAll={isGenerating || isExporting || isSaving || isLocking || isUnlocking || isRegenerating}
        generateAllLabel="Auto-fill Excel"
        generatingLabel={isSaving ? "Saving..." : isExporting ? "Exporting..." : isLocking ? "Acquiring lock..." : isUnlocking ? "Releasing lock..." : "Filling workbook..."}
        onGenerateAll={handleAutoFillExcel}
        onSave={handleSave}
        onEdit={onBeginEdit}
        onCancel={onCancelEdit}
        onForceUnlock={canForceUnlock ? onForceUnlock : undefined}
        onExport={handleExport}
        onRegenerateAll={isCompleted ? handleRegenerateAll : undefined}
        isRegenerating={isRegenerating}
        showGenerate={shouldShowGenerate}
        isEditing={isEditing}
        isDirty={isDirty}
        isLockedByOther={isLockedByOther}
        isLocking={isLocking}
        isUnlocking={isUnlocking}
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
