"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useRFIStore } from "@/store/useRFIStore";
import { useExcelStore } from "@/store/useExcelStore";
import { EditorHeader } from "@/components/editor/EditorHeader";
import { ExcelTable } from "@/components/editor/ExcelTable";
import { useAutoFillMutation } from "@/hooks/useRFIQueries";
import { exportRfiExcel } from "@/services/rfi.service";
import { useState } from "react";

interface RFIEditorProps {
  rfiId: string;
}

export function RFIEditor({ rfiId }: RFIEditorProps) {
  const file = useRFIStore((s) => s.file);
  const fileBase64 = useRFIStore((s) => s.fileBase64);
  const fileName = useRFIStore((s) => s.fileName);
  const setExcelData = useExcelStore((s) => s.setExcelData);
  const activeJobs = useRFIStore((s) => s.activeJobs);

  // Find latest job for this file
  const activeJob = activeJobs.slice().reverse().find(j => j.filename.startsWith(fileName.replace(/\.[^.]+$/, "")));
  
  const { mutate, isPending } = useAutoFillMutation();
  const [isExporting, setIsExporting] = useState(false);

  const handleAutoFillExcel = useCallback(async () => {
    let uploadFile = file;
    
    if (!uploadFile && fileBase64 && fileName) {
      try {
        const res = await fetch(fileBase64);
        const blob = await res.blob();
        uploadFile = new File([blob], fileName, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      } catch (e) {
        console.error("Failed to reconstruct file from base64", e);
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
        }
      }
    );
  }, [file, fileBase64, fileName, mutate, setExcelData]);

  const handleSave = useCallback(() => {
    toast.success("This feature is not available yet.");
  }, []);

  const handleExport = useCallback(async () => {
    const docId = activeJob?.id;
    if (!docId) {
      toast.error("You must auto-fill the document first before exporting.");
      return;
    }
    try {
      setIsExporting(true);
      await exportRfiExcel(docId);
    } catch (e) {
      toast.error("Failed to export Excel.");
    } finally {
      setIsExporting(false);
    }
  }, [activeJob?.id]);

  const displayTitle = activeJob?.filename || fileName || rfiId;
  const isGenerating = isPending || activeJob?.status === "generating";
  const isCompleted = activeJob?.status === "completed";

  return (
    <div className="flex h-full flex-col overflow-hidden bg-muted/40" style={{ height: "calc(100dvh - 3.5rem)" }}>
      <EditorHeader
        title={`RFI Project - ${displayTitle}`}
        questionCount={0}
        isGeneratingAll={isGenerating || isExporting}
        generateAllLabel="Auto-fill Excel"
        generatingLabel={isExporting ? "Exporting..." : "Filling workbook..."}
        onGenerateAll={handleAutoFillExcel}
        onSave={handleSave}
        onExport={handleExport}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="w-full">
          {(!isCompleted && !isGenerating && !file && !fileBase64) && (
            <div className="rounded-lg border bg-background p-6 shadow-sm mb-6 m-6">
              <h2 className="text-base font-semibold">Ready to generate Excel response</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Review your Excel data below. Click &quot;Auto-fill Excel&quot; to generate the answers.
              </p>
            </div>
          )}
          {isGenerating && (
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 shadow-sm mb-6 m-6 flex items-center gap-4">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-30" />
                <span className="relative inline-flex h-6 w-6 rounded-full bg-blue-500" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-blue-900">Generating answers...</h2>
                <p className="text-xs text-blue-700">Your workbook is being processed in the background. You can leave and come back anytime.</p>
              </div>
            </div>
          )}
          {isCompleted && (
            <div className="rounded-lg border border-green-200 bg-green-50/50 p-4 shadow-sm mb-6 m-6 flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
                <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-green-900">Workbook filled successfully</h2>
                <p className="text-xs text-green-700">You can now review and export your responses.</p>
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
          
          <ExcelTable isGenerated={isCompleted} documentId={activeJob?.id} />
        </div>
      </div>
    </div>
  );
}
