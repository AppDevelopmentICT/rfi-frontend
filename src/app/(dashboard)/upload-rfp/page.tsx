"use client";

import { useState } from "react";
import { FileSpreadsheet, ArrowRight } from "lucide-react";

import { FileUpload } from "@/components/shared/FileUpload";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function UploadRfpPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
    }
  };

  const handleProcess = () => {
    // Placeholder — no real API call yet
  };

  const handleClear = () => {
    setSelectedFile(null);
  };

  return (
    <div className="flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Upload RFP Document</CardTitle>
          <CardDescription>
            Upload an RFP spreadsheet to generate automated responses based on your knowledge base. Supported formats: XLSX, XLS, and CSV.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <FileUpload
            onDrop={handleDrop}
            accept={{
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
              "application/vnd.ms-excel": [".xls"],
              "text/csv": [".csv"],
            }}
            title="Drag & drop your RFP file here, or click to browse"
            description="XLSX, XLS, or CSV format"
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
            disabled={!selectedFile}
            onClick={handleProcess}
          >
            Process RFP
            <ArrowRight className="ml-1 size-4" />
          </Button>
        </CardContent>

        <CardFooter>
          <p className="text-xs text-muted-foreground">
            Processing typically takes 1–3 minutes depending on the document size and complexity.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
