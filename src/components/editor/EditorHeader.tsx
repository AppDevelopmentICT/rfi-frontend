"use client";

import { Sparkles, Download, Loader2, Save, Pencil, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ModelSelectionDialog } from "@/components/shared/ModelSelectionDialog";
import { useModelSelection } from "@/hooks/useModelSelection";

interface EditorHeaderProps {
  title: string;
  questionCount: number;
  isGeneratingAll: boolean;
  generateAllLabel?: string;
  generatingLabel?: string;
  onGenerateAll: (model?: string) => void;
  onSave?: () => void;
  onEdit?: () => void;
  onCancel?: () => void;
  onForceUnlock?: () => void;
  onExport?: () => void;
  onRegenerateAll?: (model?: string) => void;
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
  const generateModelSel = useModelSelection();
  const regenModelSel = useModelSelection();

  return (
    <>
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
              onClick={() => regenModelSel.openDialog()}
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
              onClick={() => generateModelSel.openDialog()}
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

      <ModelSelectionDialog
        modelSelection={generateModelSel}
        title="Start Auto-fill"
        description="Select the AI model you want to use to generate answers for this workbook."
        confirmLabel="Confirm & Generate"
        onConfirm={onGenerateAll}
      />

      {onRegenerateAll && (
        <ModelSelectionDialog
          modelSelection={regenModelSel}
          title="Regenerate All Answers"
          description="Select the AI model you want to use to regenerate all answers."
          confirmLabel="Confirm & Regenerate"
          onConfirm={onRegenerateAll}
        />
      )}
    </>
  );
}
