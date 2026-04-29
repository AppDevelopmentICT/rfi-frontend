"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, ArrowRight, Loader2 } from "lucide-react";

import { FileUpload } from "@/components/shared/FileUpload";
import { useRFIStore } from "@/store/useRFIStore";
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

  const setDocumentInfo = useRFIStore((s) => s.setDocumentInfo);
  const setQuestions = useRFIStore((s) => s.setQuestions);

  const handleDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
    }
  };

  const handleProcess = () => {
    if (!selectedFile) return;
    setIsOpening(true);
    const baseName = selectedFile.name.replace(/\.[^.]+$/, "") || "rfi";
    const documentId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${baseName}-${Date.now()}`;
    setDocumentInfo(documentId, selectedFile);
    setQuestions([]);
    router.push("/rfi/viewer");
  };

  const handleClear = () => {
    setSelectedFile(null);
  };

  return (
    <div className="flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Upload RFI Document</CardTitle>
          <CardDescription>
            Select your RFI Excel file. It will be uploaded only when you generate the filled workbook.
            Supported formats: XLSX and XLS.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
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
            The file is sent to the backend only when you generate the filled Excel workbook.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
