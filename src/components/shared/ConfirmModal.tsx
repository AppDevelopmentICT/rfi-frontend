"use client";

import { AlertTriangle, RotateCcw, Trash2, X } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "delete" | "restore" | "default";
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "default",
  isLoading = false,
}: ConfirmModalProps) {
  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with premium blur */}
      <div
        className="fixed inset-0 bg-background/40 backdrop-blur-md transition-opacity duration-300 animate-in fade-in-0"
        onClick={isLoading ? undefined : onClose}
      />

      {/* Modal Container */}
      <div
        className={cn(
          "relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border/80 bg-card p-6 shadow-2xl transition-all duration-300",
          "animate-in fade-in-0 zoom-in-95 duration-200"
        )}
      >
        {/* Close Button */}
        {!isLoading && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}

        <div className="flex flex-col items-center text-center">
          {/* Header Icon Indicator */}
          <div
            className={cn(
              "flex size-14 items-center justify-center rounded-full border-2 mb-4 shadow-inner",
              type === "delete" && "bg-red-50 border-red-200 text-red-500 dark:bg-red-950/30 dark:border-red-900/50",
              type === "restore" && "bg-emerald-50 border-emerald-200 text-emerald-500 dark:bg-emerald-950/30 dark:border-emerald-900/50",
              type === "default" && "bg-primary/5 border-primary/10 text-primary"
            )}
          >
            {type === "delete" && <Trash2 className="size-6 animate-pulse" />}
            {type === "restore" && <RotateCcw className="size-6" />}
            {type === "default" && <AlertTriangle className="size-6" />}
          </div>

          {/* Title & Message */}
          <h3 className="text-xl font-semibold text-foreground tracking-tight">
            {title}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed px-2">
            {message}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-input bg-background px-4 py-2 text-sm font-medium transition-all hover:bg-muted disabled:pointer-events-none disabled:opacity-50 sm:flex-1"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              "inline-flex h-10 items-center justify-center rounded-xl px-4 py-2 text-sm font-medium text-white shadow transition-all disabled:pointer-events-none disabled:opacity-50 sm:flex-1",
              type === "delete" && "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 active:scale-[0.98]",
              type === "restore" && "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-[0.98]",
              type === "default" && "bg-primary hover:bg-primary/90 active:scale-[0.98]"
            )}
          >
            {isLoading ? (
              <span className="flex items-center gap-1.5 justify-center">
                <span className="size-1.5 animate-bounce rounded-full bg-white" />
                <span className="size-1.5 animate-bounce rounded-full bg-white [animation-delay:120ms]" />
                <span className="size-1.5 animate-bounce rounded-full bg-white [animation-delay:240ms]" />
              </span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
