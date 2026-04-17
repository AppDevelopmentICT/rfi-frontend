import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  readExcel,
  autoFillExcel,
  downloadBlob,
  type AutoFillOptions,
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
  return useMutation<Blob, Error, AutoFillParams>({
    mutationFn: ({ file, options }) => autoFillExcel(file, options),
    onSuccess: (blob, { originalFileName }) => {
      const baseName = originalFileName.replace(/\.[^.]+$/, "");
      downloadBlob(blob, `${baseName}_answered.xlsx`);
      toast.success("Auto-fill complete! File downloaded.");
    },
    onError: () => {
      toast.error("Auto-fill failed. Please try again.");
    },
  });
}
