"use client";

import { useState } from "react";
import { FileText, FileIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { FileUpload } from "@/components/shared/FileUpload";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { IngestedFile } from "@/types/knowledge-base";

const MOCK_FILES: IngestedFile[] = [
  { id: "1", name: "Company_Profile.pdf", date: "2026-04-14", size: "2.4 MB", type: "pdf" },
  { id: "2", name: "Product_Specifications.docx", date: "2026-04-13", size: "1.8 MB", type: "docx" },
  { id: "3", name: "Pricing_Guide.txt", date: "2026-04-12", size: "456 KB", type: "txt" },
  { id: "4", name: "Terms_Conditions.pdf", date: "2026-04-11", size: "3.1 MB", type: "pdf" },
  { id: "5", name: "Technical_Documentation.pdf", date: "2026-04-10", size: "5.7 MB", type: "pdf" },
];

const FILE_TYPE_COLORS: Record<IngestedFile["type"], string> = {
  pdf: "destructive",
  docx: "secondary",
  txt: "outline",
};

export default function KnowledgeBasePage() {
  const [files, setFiles] = useState<IngestedFile[]>(MOCK_FILES);

  const handleDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const newFiles: IngestedFile[] = acceptedFiles.map((file, index) => {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "txt";
      return {
        id: `${Date.now()}-${index}`,
        name: file.name,
        date: new Date().toISOString().split("T")[0],
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        type: (["pdf", "docx", "txt"].includes(extension)
          ? extension
          : "txt") as IngestedFile["type"],
      };
    });

    setFiles((prev) => [...newFiles, ...prev]);
    toast.success(`${newFiles.length} file(s) uploaded successfully`);
  };

  const handleDelete = (id: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== id));
    toast.success("File removed from knowledge base");
  };

  return (
    <div className="flex flex-col gap-8 p-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Knowledge Base</h1>
        <p className="text-sm text-muted-foreground">
          Upload and manage reference documents that power your RFP responses. Supported formats: PDF, DOCX, and TXT.
        </p>
      </div>

      {/* Upload Section */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">Upload Documents</h2>
        <FileUpload
          onDrop={handleDrop}
          accept={{
            "application/pdf": [".pdf"],
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
            "text/plain": [".txt"],
          }}
          title="Drag & drop files here, or click to browse"
          description="PDF, DOCX, or TXT — up to 10 MB per file"
        />
      </section>

      {/* File Table Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">
            Ingested Files
          </h2>
          <span className="text-xs text-muted-foreground">
            {files.length} file{files.length !== 1 ? "s" : ""}
          </span>
        </div>

        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/20 py-12 text-center">
            <FileIcon className="mb-3 size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No documents in your knowledge base yet.
            </p>
            <p className="text-xs text-muted-foreground/70">
              Upload files above to get started.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-4">File Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Upload Date</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-muted-foreground" />
                        <span className="font-medium">{file.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={FILE_TYPE_COLORS[file.type] as "destructive" | "secondary" | "outline"}>
                        {file.type.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {file.date}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {file.size}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(file.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                        <span className="sr-only">Delete {file.name}</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
