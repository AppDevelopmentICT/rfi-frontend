"use client";

import { useState } from "react";
import { Document as PdfDocument, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Download, Loader2, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { KBDocument } from "@/services/knowledge.service";
import { apiClient } from "@/lib/axios";
import { downloadBlob } from "@/services/rfi.service";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface PdfPreviewSheetProps {
  doc: KBDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PdfPreviewSheet({ doc, open, onOpenChange }: PdfPreviewSheetProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfScale, setPdfScale] = useState(1);

  const loadPreview = async () => {
    if (!doc) return;
    setPreviewUrl(null);
    setPreviewType("");
    setPageNumber(1);
    setNumPages(0);
    setPreviewLoading(true);
    try {
      const res = await apiClient.get<Blob>(`/v1/knowledge/download/${encodeURIComponent(doc.filename)}`, {
        responseType: "blob",
      });
      const blob = res.data;
      const url = URL.createObjectURL(blob);
      const headerType = res.headers["content-type"];
      setPreviewType(blob.type || (typeof headerType === "string" ? headerType : ""));
      setPreviewUrl(url);
    } catch {
      setPreviewUrl(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (isOpen && doc) {
      loadPreview();
    }
    if (!isOpen && previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const downloadDocument = async () => {
    if (!doc) return;
    const res = await apiClient.get<Blob>(`/v1/knowledge/download/${encodeURIComponent(doc.filename)}`, {
      responseType: "blob",
    });
    downloadBlob(res.data, doc.filename);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-[90vw] sm:max-w-[90vw]">
        <SheetHeader>
          <SheetTitle>{doc?.filename}</SheetTitle>
          <SheetDescription>
            {doc?.product || "Unassigned"} Knowledge Base document
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-auto px-4 pb-4">
          {previewLoading ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 size-5 animate-spin" />
              Loading preview...
            </div>
          ) : previewUrl && previewType.includes("pdf") ? (
            <div className="space-y-4">
              <div className="sticky top-0 z-10 flex items-center justify-between rounded-lg border bg-background p-2">
                <div className="text-sm text-muted-foreground">
                  Page {pageNumber} of {numPages || "?"}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPageNumber((page) => Math.max(1, page - 1))}
                    disabled={pageNumber <= 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPageNumber((page) => Math.min(numPages || page, page + 1))}
                    disabled={numPages > 0 && pageNumber >= numPages}
                  >
                    Next
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => setPdfScale((scale) => Math.max(0.6, scale - 0.1))}>
                    <ZoomOut className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => setPdfScale((scale) => Math.min(1.8, scale + 0.1))}>
                    <ZoomIn className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="flex justify-center rounded-xl bg-muted p-4">
                <PdfDocument
                  file={previewUrl}
                  onLoadSuccess={({ numPages: pages }) => setNumPages(pages)}
                >
                  <Page pageNumber={pageNumber} scale={pdfScale} />
                </PdfDocument>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <p className="font-medium">Inline preview is available for PDF files only.</p>
              {doc && (
                <Button className="mt-4" onClick={downloadDocument}>
                  <Download className="size-4" />
                  Download {doc.filename}
                </Button>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
