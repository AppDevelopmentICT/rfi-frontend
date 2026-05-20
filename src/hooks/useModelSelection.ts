"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { fetchOllamaModels } from "@/services/ollama.service";

export interface ModelSelectionState {
  /** Whether the model-selection dialog is open. */
  isOpen: boolean;
  /** Whether models are currently being fetched. */
  isLoading: boolean;
  /** Sorted model list (default model first). */
  models: string[];
  /** The server-configured default model name. */
  defaultModel: string;
  /** Currently selected model in the dialog. */
  selectedModel: string;
}

export interface UseModelSelectionReturn extends ModelSelectionState {
  /** Open the dialog and fetch models. */
  openDialog: () => void;
  /** Close the dialog. */
  closeDialog: () => void;
  /** Update the selected model. */
  setSelectedModel: (model: string) => void;
  /**
   * Confirm the selection. Returns the chosen model (or undefined to
   * signal cancellation). Closes the dialog automatically.
   */
  confirmSelection: () => string | undefined;
}

/**
 * Reusable hook that manages the full lifecycle of an Ollama model-selection
 * dialog: fetching models from the backend, auto-selecting the default,
 * sorting, and confirming a choice.
 *
 * Used by RFI (Excel), RFI-PDF, and RFP editors.
 */
export function useModelSelection(): UseModelSelectionReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [defaultModel, setDefaultModel] = useState("");
  const [selectedModel, setSelectedModel] = useState("");

  const openDialog = useCallback(() => {
    setIsOpen(true);
    setIsLoading(true);
    fetchOllamaModels()
      .then((res) => {
        const allModels = res.models || [];
        const def = res.defaultModel || "";
        const ordered = def
          ? [def, ...allModels.filter((m) => m !== def)]
          : allModels;
        setModels(ordered);
        setDefaultModel(def);
        setSelectedModel(def || (allModels[0] ?? ""));
      })
      .catch(() => {
        toast.error("Failed to fetch Ollama models. Is Ollama running?");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const closeDialog = useCallback(() => {
    setIsOpen(false);
  }, []);

  const confirmSelection = useCallback((): string | undefined => {
    setIsOpen(false);
    return selectedModel || undefined;
  }, [selectedModel]);

  return {
    isOpen,
    isLoading,
    models,
    defaultModel,
    selectedModel,
    openDialog,
    closeDialog,
    setSelectedModel,
    confirmSelection,
  };
}
