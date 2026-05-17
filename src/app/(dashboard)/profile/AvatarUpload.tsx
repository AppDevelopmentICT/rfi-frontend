"use client";

import { useCallback, useRef, useState } from "react";
import { Camera, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { uploadAvatar, getAvatarUrl } from "@/services/profile.service";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { RecordModel } from "pocketbase";

interface AvatarUploadProps {
  user: RecordModel | null;
  name: string;
  onUploadComplete?: (record: RecordModel) => void;
}

function getInitials(name: string, email?: string) {
  const value = name || email || "?";
  return value
    .split(/\s+|@/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AvatarUpload({ user, name, onUploadComplete }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const avatarUrl = previewUrl || getAvatarUrl(user, 200) || undefined;
  const initials = getInitials(name, user?.email);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be smaller than 5 MB");
        return;
      }

      const localPreview = URL.createObjectURL(file);
      setPreviewUrl(localPreview);
      setUploading(true);

      try {
        const updatedRecord = await uploadAvatar(file);
        toast.success("Profile picture updated");
        onUploadComplete?.(updatedRecord);
      } catch (err: unknown) {
        setPreviewUrl(null);
        URL.revokeObjectURL(localPreview);
        const msg =
          err instanceof Error ? err.message : "Failed to upload avatar";
        toast.error(msg);
      } finally {
        setUploading(false);
      }
    },
    [onUploadComplete]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) void handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleFile(file);
      if (inputRef.current) inputRef.current.value = "";
    },
    [handleFile]
  );

  const clearPreview = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [previewUrl]);

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
      <div
        className="group/avatar-container relative cursor-pointer"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !uploading && inputRef.current?.click()}
      >
        <div
          className={`
            relative size-28 rounded-full transition-all duration-200
            ring-2 ring-border ring-offset-4 ring-offset-background
            group-hover/avatar-container:ring-primary/40
            ${dragOver ? "ring-primary/60 scale-105" : ""}
            ${uploading ? "opacity-70" : ""}
          `}
        >
          <Avatar className="size-full" style={{ width: "100%", height: "100%" }}>
            <AvatarImage src={avatarUrl} alt={name} />
            <AvatarFallback className="text-2xl font-semibold">{initials}</AvatarFallback>
          </Avatar>

          {!uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/0 transition-colors duration-200 group-hover/avatar-container:bg-foreground/30">
              <Camera className="size-6 text-background opacity-0 transition-opacity duration-200 group-hover/avatar-container:opacity-100" />
            </div>
          )}

          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/40">
              <Loader2 className="size-8 animate-spin text-background" />
            </div>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleInputChange}
        />
      </div>

      <div className="flex flex-col items-center gap-2 sm:items-start">
        <p className="text-sm font-medium text-foreground">Profile Picture</p>
        <p className="text-xs text-muted-foreground max-w-[220px] text-center sm:text-left">
          Click or drag an image to upload. JPG, PNG or WebP, max 5 MB.
        </p>
        <div className="mt-1 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="gap-1.5"
          >
            <Upload className="size-3.5" />
            Upload
          </Button>
          {previewUrl && !uploading && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearPreview}
              className="gap-1.5 text-muted-foreground"
            >
              <X className="size-3.5" />
              Clear
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
