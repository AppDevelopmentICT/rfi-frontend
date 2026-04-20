import { apiClient } from "@/lib/axios";
import type { ExcelData } from "@/types/excel";

// ---------------------------------------------------------------------------
// POST /api/v1/rfi/read — upload Excel, get parsed sheets as JSON
// ---------------------------------------------------------------------------

export async function readExcel(file: File): Promise<ExcelData> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await apiClient.post<ExcelData>("/api/v1/rfi/read", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

// ---------------------------------------------------------------------------
// POST /api/v1/rfi/auto-fill — upload Excel, get filled Excel back as blob
// ---------------------------------------------------------------------------

export interface AutoFillOptions {
  model?: string;
  contextColumns?: string;
  fillColumns?: string;
}

export async function autoFillExcel(
  file: File,
  options?: AutoFillOptions
): Promise<Blob> {
  const formData = new FormData();
  formData.append("file", file);

  if (options?.model) formData.append("model", options.model);
  if (options?.contextColumns)
    formData.append("context_columns", options.contextColumns);
  if (options?.fillColumns)
    formData.append("fill_columns", options.fillColumns);

  const { data } = await apiClient.post("/api/v1/rfi/auto-fill", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    responseType: "blob",
  });
  return data as Blob;
}

// ---------------------------------------------------------------------------
// Helper — trigger browser download from a blob
// ---------------------------------------------------------------------------

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
