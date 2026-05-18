"use client";

import { Sparkles, Download, Loader2, Save, Pencil, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface EditorHeaderProps {
  title: string;
  questionCount: number;
  isGeneratingAll: boolean;
  /** Primary action label when idle (default: Generate All) */
  generateAllLabel?: string;
  /** Primary action label while running (default: Generating...) */
  generatingLabel?: string;
  onGenerateAll: () => void;
  onSave?: () => void;
  onEdit?: () => void;
  onCancel?: () => void;
  onForceUnlock?: () => void;
  onExport?: () => void;
  onRegenerateAll?: () => void;
  /**
   * BUG 3 FIX: dedicated flag for the "Regenerate All" button so it can show
   * its own loading/disabled state independently of the broader
   * `isGeneratingAll` flag (which also covers save/export/lock states).
   */
  isRegenerating?: boolean;
  saveLabel?: string;
  showGenerate?: boolean;
  isEditing?: boolean;
  isDirty?: boolean;
  isLockedByOther?: boolean;
  isLocking?: boolean;
  isUnlocking?: boolean;
}

export function EditorHeader({
  title,
  questionCount,
  isGeneratingAll,
  generateAllLabel = "Generate All",
  generatingLabel = "Generating...",
  onGenerateAll,
  onSave,
  onEdit,
  onCancel,
  onForceUnlock,
  onExport,
  onRegenerateAll,
  isRegenerating = false,
  saveLabel = "Save Changes",
  showGenerate = true,
  isEditing = false,
  isDirty = false,
  isLockedByOther = false,
  isLocking = false,
  isUnlocking = false,
}: EditorHeaderProps) {
  // BUG 3 DEBUG: Verify the regenerate state is reaching this component.
  // Expected: logs `false` initially, then `true` for the entire duration of
  // the "Regenerate All" loop, then `false` again when finished.
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log("[EditorHeader] isRegenerating:", isRegenerating, "| isGeneratingAll:", isGeneratingAll);
  }

  return (
    <div className="flex shrink-0 items-center justify-between border-b bg-background/95 px-6 py-3 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        <Badge variant="secondary">
          {questionCount > 0 ? `${questionCount} questions` : "Excel file"}
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        {isLockedByOther && onForceUnlock && (
          <Button variant="destructive" size="sm" onClick={onForceUnlock}>
            Force unlock
          </Button>
        )}
        {!isEditing && onEdit && !isLockedByOther && (
          <Button variant="outline" size="sm" onClick={onEdit} disabled={isLocking}>
            {isLocking ? <Loader2 className="size-4 animate-spin" /> : <Pencil className="size-4" />}
            {isLocking ? "Locking..." : "Edit"}
          </Button>
        )}
        {isEditing && onCancel && (
          <Button variant="outline" size="sm" onClick={onCancel} disabled={isUnlocking}>
            {isUnlocking ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
            {isUnlocking ? "Cancelling..." : "Cancel"}
          </Button>
        )}
        {isEditing && onSave && (
          <Button size="sm" onClick={onSave} disabled={isGeneratingAll || !isDirty}>
            <Save className="size-4" />
            {saveLabel}
          </Button>
        )}
        {onExport && (
          <Button variant="outline" size="sm" onClick={onExport} disabled={isGeneratingAll}>
            <Download className="size-4" />
            Export Excel
          </Button>
        )}
        {onRegenerateAll && !showGenerate && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerateAll}
            // BUG 3 FIX: Disable the button while any long-running action is in
            // flight (so spam-clicks during save/export/lock are also blocked),
            // but the spinner + "Regenerating..." label is only shown when the
            // regenerate flow itself is running.
            disabled={isGeneratingAll || isRegenerating}
            className="gap-1.5 text-muted-foreground"
            aria-busy={isRegenerating}
          >
            {isRegenerating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            {isRegenerating ? "Regenerating..." : "Regenerate All"}
          </Button>
        )}
        {showGenerate && (
          <Button
            variant="default"
            size="sm"
            onClick={onGenerateAll}
            disabled={isGeneratingAll}
          >
            {isGeneratingAll ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Sparkles />
            )}
            {isGeneratingAll ? generatingLabel : generateAllLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
