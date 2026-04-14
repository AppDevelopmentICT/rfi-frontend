"use client";

import { useCallback } from "react";
import { useDropzone, type Accept } from "react-dropzone";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onDrop: (acceptedFiles: File[]) => void;
  accept?: Accept;
  title: string;
  description: string;
}

export function FileUpload({
  onDrop,
  accept,
  title,
  description,
}: FileUploadProps) {
  const handleDrop = useCallback(
    (acceptedFiles: File[]) => {
      onDrop(acceptedFiles);
    },
    [onDrop]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept,
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "group relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors duration-200",
        isDragActive
          ? "border-primary/50 bg-muted/60"
          : "border-muted-foreground/25 bg-muted/30 hover:border-muted-foreground/40 hover:bg-muted/50"
      )}
    >
      <input {...getInputProps()} />

      <div
        className={cn(
          "flex size-12 items-center justify-center rounded-full transition-colors duration-200",
          isDragActive ? "bg-primary/10" : "bg-muted"
        )}
      >
        <UploadCloud
          className={cn(
            "size-6 transition-colors duration-200",
            isDragActive ? "text-primary" : "text-muted-foreground"
          )}
        />
      </div>

      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      {isDragActive && (
        <p className="absolute inset-x-0 -bottom-7 text-center text-xs font-medium text-primary">
          Drop to upload
        </p>
      )}
    </div>
  );
}
