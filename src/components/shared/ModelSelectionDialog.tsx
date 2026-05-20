"use client";

import { Loader2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import type { UseModelSelectionReturn } from "@/hooks/useModelSelection";

interface ModelSelectionDialogProps {
  /** Hook state + actions from `useModelSelection()`. */
  modelSelection: UseModelSelectionReturn;
  /** Dialog title. */
  title?: string;
  /** Dialog description. */
  description?: string;
  /** Label on the confirm button. */
  confirmLabel?: string;
  /** Callback when user confirms a model selection. */
  onConfirm: (model: string) => void;
}

/**
 * Reusable Ollama model-selection dialog.
 *
 * Pair with `useModelSelection()` for state management:
 *
 * ```tsx
 * const ms = useModelSelection();
 *
 * <Button onClick={() => {
 *   ms.openDialog();
 *   setPendingAction("generate");
 * }}>Generate</Button>
 *
 * <ModelSelectionDialog
 *   modelSelection={ms}
 *   onConfirm={(model) => { /* do something with model *\/ }}
 * />
 * ```
 */
export function ModelSelectionDialog({
  modelSelection,
  title = "Select AI Model",
  description = "Choose the Ollama model to use for generation.",
  confirmLabel = "Confirm",
  onConfirm,
}: ModelSelectionDialogProps) {
  const {
    isOpen,
    isLoading,
    models,
    defaultModel,
    selectedModel,
    closeDialog,
    setSelectedModel,
  } = modelSelection;

  const handleConfirm = () => {
    const model = selectedModel || undefined;
    closeDialog();
    if (model) onConfirm(model);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading models...
            </div>
          ) : models.length === 0 ? (
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
              <SelectContent>
                {models.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}{model === defaultModel ? " (Default)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={closeDialog}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={isLoading || models.length === 0}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
