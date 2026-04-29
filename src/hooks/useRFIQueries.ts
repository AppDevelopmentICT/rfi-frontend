import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  readExcel,
  autoFillExcel,
  downloadBlob,
  type AutoFillOptions,
  type AutoFillResult,
} from "@/services/rfi.service";
import type { ExcelData } from "@/types/excel";

export function useReadExcelMutation() {
  return useMutation<ExcelData, Error, File>({
    mutationFn: readExcel,
    onError: () => {
      toast.error("Failed to read Excel file. Please try again.");
    },
  });
}

interface AutoFillParams {
  file: File;
  originalFileName: string;
  options?: AutoFillOptions;
}

export function useAutoFillMutation() {
  return useMutation<AutoFillResult, Error, AutoFillParams>({
    mutationFn: ({ file, originalFileName, options }) =>
      autoFillExcel(file, originalFileName, options),
    onSuccess: (result) => {
      downloadBlob(result.blob, result.filename);
      toast.success(
        result.message?.trim()
          ? result.message
          : "Filled workbook downloaded.",
      );
    },
    onError: (err) => {
      toast.error(err.message || "Auto-fill failed. Please try again.");
    },
  });
}
