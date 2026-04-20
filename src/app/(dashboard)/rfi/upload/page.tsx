"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, ArrowRight, Loader2 } from "lucide-react";

import { FileUpload } from "@/components/shared/FileUpload";
import { ColumnPickerModal } from "@/components/shared/ColumnPickerModal";
import { useReadExcelMutation } from "@/hooks/useRFIQueries";
import { useExcelStore } from "@/store/useExcelStore";
import { useRFIStore } from "@/store/useRFIStore";
import type { Question } from "@/types/question";
import type { ExcelData } from "@/types/excel";
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [excelData, setLocalExcelData] = useState<ExcelData | null>(null);
  const router = useRouter();

  const readExcelMutation = useReadExcelMutation();
  const setExcelData = useExcelStore((s) => s.setExcelData);
  const setDocumentInfo = useRFIStore((s) => s.setDocumentInfo);
  const setQuestions = useRFIStore((s) => s.setQuestions);

  const handleDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
    }
  };

  const handleProcess = () => {
    if (!selectedFile) return;
    readExcelMutation.mutate(selectedFile, {
      onSuccess: (data) => {
        setExcelData(data);
        setLocalExcelData(data);
        setDocumentInfo(crypto.randomUUID(), selectedFile);
        setPickerOpen(true);
      },
    });
  };

  const handlePickerConfirm = (questions: Question[]) => {
    setQuestions(questions);
    setPickerOpen(false);
    router.push("/rfi/viewer");
  };

  const handlePickerClose = () => {
    setPickerOpen(false);
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
            Upload your RFI Excel file to start generating AI responses. Supported formats: XLSX and XLS.
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
            disabled={!selectedFile || readExcelMutation.isPending}
            onClick={handleProcess}
          >
            {readExcelMutation.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <ArrowRight className="ml-1 size-4" />
            )}
            {readExcelMutation.isPending ? "Processing..." : "Process RFI"}
          </Button>
        </CardContent>

        <CardFooter>
          <p className="text-xs text-muted-foreground">
            Processing typically takes a few seconds depending on the file size.
          </p>
        </CardFooter>
      </Card>

      {excelData && selectedFile && (
        <ColumnPickerModal
          open={pickerOpen}
          onClose={handlePickerClose}
          onConfirm={handlePickerConfirm}
          excelData={excelData}
          fileName={selectedFile.name}
        />
      )}
    </div>
  );
}
