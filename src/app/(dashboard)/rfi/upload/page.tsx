"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, ArrowRight, Loader2, Trash2 } from "lucide-react";

import { FileUpload } from "@/components/shared/FileUpload";
import { useRFIStore } from "@/store/useRFIStore";
import { useExcelStore } from "@/store/useExcelStore";
import { useReadExcelMutation } from "@/hooks/useRFIQueries";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function UploadRfiPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const router = useRouter();

  const { mutate } = useReadExcelMutation();
  const setDocumentInfo = useRFIStore((s) => s.setDocumentInfo);
  const resetRFIStore = useRFIStore((s) => s.reset);
  const setExcelData = useExcelStore((s) => s.setExcelData);
  const resetExcelStore = useExcelStore((s) => s.reset);
  
  const savedFileName = useRFIStore((s) => s.fileName);
  const documentId = useRFIStore((s) => s.documentId);

  // Strict Approach 1: a single source of truth for the conditional render.
  // fileObjectUrl is ephemeral (invalid after refresh), so we also check
  // documentId which is persisted.
  const hasLocalDraft = Boolean(savedFileName && documentId);

  const handleDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
    }
  };

  const handleProcess = () => {
    if (!selectedFile) return;
    setIsOpening(true);
    
    mutate(selectedFile, {
      onSuccess: (data) => {
        setDocumentInfo(data.documentId, selectedFile);
        useRFIStore.setState({ fileName: data.fileName });
        setExcelData(data.excelData);
        router.push(`/rfi/viewer`);
      },
      onSettled: () => setIsOpening(false),
    });
  };

  const handleClear = () => {
    setSelectedFile(null);
  };

  const handleDeleteLocal = () => {
    resetRFIStore();
    resetExcelStore();
  };

  const handleContinueLocal = () => {
    router.push(`/rfi/viewer`);
  };

  return (
    <div className="flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Upload RFI Document</CardTitle>
          <CardDescription>
            Select your RFI Excel file. It will be temporarily saved in your browser until auto-fill succeeds.
            Supported formats: XLSX and XLS.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {hasLocalDraft ? (
            /* ──────────────────────────────────────────────────────────
               STRICT APPROACH 1: Local draft exists.
               Render ONLY the integrated draft row. Dropzone is hidden.
               ────────────────────────────────────────────────────────── */
            <div className="flex items-center gap-4 rounded-lg border border-border bg-white p-4">
              <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted/40">
                <FileSpreadsheet className="size-5 text-muted-foreground" />
              </div>

              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-xs text-muted-foreground">
                  Unsaved Local Draft
                </span>
                <div className="flex items-center gap-2 min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {savedFileName}
                  </p>
                  <Badge variant="secondary" className="font-normal">
                    Unsaved
                  </Badge>
                </div>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteLocal}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="mr-1 size-4" />
                  Delete
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleContinueLocal}
                >
                  Continue
                  <ArrowRight className="ml-1 size-4" />
                </Button>
              </div>
            </div>
          ) : (
            /* ──────────────────────────────────────────────────────────
               No local draft. Render ONLY the Dropzone + selection UI.
               ────────────────────────────────────────────────────────── */
            <>
              <FileUpload
                onDrop={handleDrop}
                accept={{
                  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
                  "application/vnd.ms-excel": [".xls"],
                }}
                title="Drag & drop your RFI file here, or click to browse"
                description="XLSX or XLS format"
              />

              {selectedFile && (
                <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                      <FileSpreadsheet className="size-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={handleClear}
                    className="text-muted-foreground"
                  >
                    Remove
                  </Button>
                </div>
              )}

              <Button
                className="w-full"
                size="lg"
                disabled={!selectedFile || isOpening}
                onClick={handleProcess}
              >
                {isOpening ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <ArrowRight className="ml-1 size-4" />
                )}
                {isOpening ? "Opening..." : "Open RFI"}
              </Button>
            </>
          )}
        </CardContent>

        <CardFooter>
          <p className="text-xs text-muted-foreground">
            The file will be securely parsed and saved.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
