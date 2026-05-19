"use client";

import { useState, useCallback } from "react";
import { Sparkles, Download, Loader2, Save, Pencil, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchOllamaModels } from "@/services/rfi.service";

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
  const [isModelDialogOpen, setIsModelDialogOpen] = useState(false);
  const [isRegenDialogOpen, setIsRegenDialogOpen] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [defaultModel, setDefaultModel] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [dialogMode, setDialogMode] = useState<"generate" | "regenerate">("generate");

  const loadModels = useCallback(async () => {
    setIsLoadingModels(true);
    try {
      const res = await fetchOllamaModels();
      const allModels = res.models || [];
      const def = res.defaultModel || "";
      const ordered = def
        ? [def, ...allModels.filter((m) => m !== def)]
        : allModels;
      setAvailableModels(ordered);
      setDefaultModel(def);
      if (!selectedModel && def) {
        setSelectedModel(def);
      }
    } catch {
      toast.error("Failed to fetch Ollama models. Is Ollama running?");
    } finally {
      setIsLoadingModels(false);
    }
  }, [selectedModel]);

  const handleOpenGenerateDialog = () => {
    setDialogMode("generate");
    setIsModelDialogOpen(true);
    loadModels();
  };

  const handleOpenRegenDialog = () => {
    setDialogMode("regenerate");
    setIsRegenDialogOpen(true);
    loadModels();
  };

  const handleConfirm = () => {
    if (dialogMode === "generate") {
      setIsModelDialogOpen(false);
      onGenerateAll(selectedModel || undefined);
    } else {
      setIsRegenDialogOpen(false);
      onRegenerateAll?.(selectedModel || undefined);
    }
  };

  const handleDialogClose = () => {
    if (dialogMode === "generate") {
      setIsModelDialogOpen(false);
    } else {
      setIsRegenDialogOpen(false);
    }
  };

  const isDialogOpen = dialogMode === "generate" ? isModelDialogOpen : isRegenDialogOpen;

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
              onClick={handleOpenRegenDialog}
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
              onClick={handleOpenGenerateDialog}
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

      <Dialog open={isDialogOpen} onOpenChange={(open: boolean) => { if (!open) handleDialogClose(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "generate" ? "Start Auto-fill" : "Regenerate All Answers"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "generate"
                ? "Select the AI model you want to use to generate answers for this workbook."
                : "Select the AI model you want to use to regenerate all answers."}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            {isLoadingModels ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading models...
              </div>
            ) : availableModels.length === 0 ? (
              <div className="text-sm text-destructive">
                No models found. Make sure Ollama is running and has models installed.
              </div>
            ) : (
              <Select
                value={selectedModel}
                onValueChange={(val) => { if (val) setSelectedModel(val); }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent side="bottom" sideOffset={4} align="center">
                  {availableModels.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}{model === defaultModel ? " (Default)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={handleDialogClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={isLoadingModels || availableModels.length === 0}
            >
              {dialogMode === "generate" ? "Confirm & Generate" : "Confirm & Regenerate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
