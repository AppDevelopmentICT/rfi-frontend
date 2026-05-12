"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { FileUpload } from "@/components/shared/FileUpload";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { uploadRfiPdf } from "@/services/rfi-pdf.service";

const MAX_PDF_BYTES = 25 * 1024 * 1024;

export default function UploadRfiPdfPage() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleDrop = (files: File[]) => {
    if (!files.length) return;
    const file = files[0];
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Only PDF files are accepted for this flow.");
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      toast.error("File is larger than 25 MB.");
      return;
    }
    setSelectedFile(file);
  };

  const handleStart = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    try {
      const project = await uploadRfiPdf(selectedFile);
      toast.success("Upload received. AI extraction starting…");
      router.push(`/rfi-pdf/${encodeURIComponent(project.documentId)}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Upload RFI PDF</CardTitle>
          <CardDescription>
            Upload an RFI PDF folder document. We will extract the requirements,
            draft an AI response, and open a WYSIWYG editor where you can refine
            and insert projects/engineers from the right sidebar.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <FileUpload
            onDrop={handleDrop}
            accept={{ "application/pdf": [".pdf"] }}
            title="Drag & drop your RFI PDF here, or click to browse"
            description="PDF format only · max 25 MB"
          />

          {selectedFile && (
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="size-4 text-primary" />
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
                onClick={() => setSelectedFile(null)}
                className="text-muted-foreground"
              >
                Remove
              </Button>
            </div>
          )}

          <Button
            className="w-full"
            size="lg"
            disabled={!selectedFile || isUploading}
            onClick={handleStart}
          >
            {isUploading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <ArrowRight className="ml-1 size-4" />
            )}
            {isUploading ? "Uploading…" : "Start AI Extraction"}
          </Button>
        </CardContent>

        <CardFooter>
          <p className="text-xs text-muted-foreground">
            We never overwrite your source PDF. The AI draft is stored separately
            and you keep full edit control before exporting.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
