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
  disabled?: boolean;
}

export function FileUpload({
  onDrop,
  accept,
  title,
  description,
  disabled = false,
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
    multiple: true,
    disabled,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "group relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors duration-200",
        disabled
          ? "cursor-not-allowed opacity-50 pointer-events-none border-muted-foreground/10 bg-muted/20"
          : isDragActive
            ? "cursor-pointer border-primary/50 bg-muted/60"
            : "cursor-pointer border-muted-foreground/20 bg-muted/40 hover:border-muted-foreground/35 hover:bg-muted/60"
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
