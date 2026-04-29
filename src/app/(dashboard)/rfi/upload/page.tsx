"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, ArrowRight, Loader2 } from "lucide-react";

import { FileUpload } from "@/components/shared/FileUpload";
import { useRFIStore } from "@/store/useRFIStore";
import { useExcelStore } from "@/store/useExcelStore";
import { useReadExcelMutation } from "@/hooks/useRFIQueries";
import { FileDown, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function UploadRfiPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const router = useRouter();

  const { mutate, isPending } = useReadExcelMutation();
  const setDocumentInfo = useRFIStore((s) => s.setDocumentInfo);
  const resetRFIStore = useRFIStore((s) => s.reset);
  const setExcelData = useExcelStore((s) => s.setExcelData);
  const resetExcelStore = useExcelStore((s) => s.reset);
  
  const savedFileName = useRFIStore((s) => s.fileName);
  const savedFileBase64 = useRFIStore((s) => s.fileBase64);

  const handleDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
    }
  };

  const handleProcess = () => {
    if (!selectedFile) return;
    setIsOpening(true);
    
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      mutate(selectedFile, {
        onSuccess: (data) => {
          setDocumentInfo(data.documentId, selectedFile, base64);
          useRFIStore.setState({ fileName: data.fileName });
          setExcelData(data.excelData);
          router.push(`/rfi/viewer`);
        },
        onSettled: () => setIsOpening(false),
      });
    };
    reader.readAsDataURL(selectedFile);
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
          {(savedFileName && savedFileBase64) && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-blue-100">
                    <FileDown className="size-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-blue-900">Unsaved Local Draft</h3>
                    <p className="text-xs text-blue-700 mt-1">{savedFileName}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleDeleteLocal} className="text-destructive hover:bg-destructive hover:text-destructive-foreground">
                    <Trash2 className="size-4 mr-1" />
                    Delete
                  </Button>
                  <Button size="sm" onClick={handleContinueLocal}>
                    Continue
                  </Button>
                </div>
              </div>
            </div>
          )}
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
