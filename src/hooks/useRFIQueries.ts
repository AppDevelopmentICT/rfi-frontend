import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  uploadAndReadExcel,
  autoFillExcel,
  updateRfiCell,
  regenerateRfiRow,
  type AutoFillOptions,
  type AutoFillResult,
  type RegenerateRowResult,
  type UploadRfiResponse,
} from "@/services/rfi.service";

export function useReadExcelMutation() {
  return useMutation<UploadRfiResponse, Error, File>({
    mutationFn: uploadAndReadExcel,
    retry: false,
    onError: () => {
      toast.error("Failed to read Excel file. Please try again.");
    },
  });
}

interface AutoFillParams {
  file: File;
  options?: AutoFillOptions;
}

import { useRFIStore } from "@/store/useRFIStore";

export function useAutoFillMutation() {
  return useMutation<AutoFillResult, Error, AutoFillParams>({
    mutationFn: ({ file, options }) =>
      autoFillExcel(file, options),
    retry: false,
    onSuccess: (result, variables) => {
      useRFIStore.getState().addJob({
        id: result.documentId,
        filename: result.fileName || variables.file.name.replace(/\.[^.]+$/, "") + "_answered.xlsx",
        status: "generating"
      });
      toast.success("Workbook generation started in background.");
    },
    onError: (err) => {
      toast.error(err.message || "Auto-fill failed to start. Please try again.");
    },
  });
}

interface UpdateCellParams {
  documentId: string;
  sheet: string;
  rowIdx: number;
  column: string;
  value: string;
}

export function useUpdateCellMutation() {
  return useMutation<void, Error, UpdateCellParams>({
    mutationFn: ({ documentId, sheet, rowIdx, column, value }) =>
      updateRfiCell(documentId, sheet, rowIdx, column, value),
    retry: false,
    onError: () => {
      toast.error("Failed to update cell.");
    },
  });
}

interface RegenerateRowParams {
  documentId: string;
  sheet: string;
  rowIdx: number;
  currentRow?: Record<string, string>;
}

export function useRegenerateRfiRowMutation() {
  return useMutation<RegenerateRowResult, Error, RegenerateRowParams>({
    mutationFn: ({ documentId, sheet, rowIdx, currentRow }) =>
      regenerateRfiRow(documentId, sheet, rowIdx, currentRow),
    retry: false,
    onError: () => {
      toast.error("Failed to regenerate answer.");
    },
  });
}
