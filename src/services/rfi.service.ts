import axios, { type AxiosError } from "axios";

import { apiClient } from "@/lib/axios";
import type { ExcelData } from "@/types/excel";

// ---------------------------------------------------------------------------
// POST /v1/rfi/read — upload Excel, get parsed sheets as JSON
// ---------------------------------------------------------------------------

export interface UploadRfiResponse {
  documentId: string;
  fileName: string;
  excelData: ExcelData;
}

export async function uploadAndReadExcel(file: File): Promise<UploadRfiResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await apiClient.post<UploadRfiResponse>("/v1/rfi/upload-and-read", formData);
  return data;
}

export interface RFIProjectResponse {
  documentId: string;
  fileName: string;
  excelData: ExcelData;
  status: string;
}

export async function getRfiDocument(documentId: string): Promise<RFIProjectResponse> {
  const { data } = await apiClient.get<RFIProjectResponse>(`/v1/rfi/${documentId}`);
  return data;
}

// ---------------------------------------------------------------------------
// POST /v1/rfi/auto-fill — upload Excel, get filled .xlsx as blob (exact server output)
// ---------------------------------------------------------------------------

export interface AutoFillOptions {
  model?: string;
  contextColumns?: string;
  fillColumns?: string;
}

export interface AutoFillResult {
  documentId: string;
  status: string;
  fileName?: string;
  excelData?: ExcelData;
  message?: string;
}

function parseContentDispositionFilename(cd: string | undefined, fallback: string): string {
  if (!cd) return fallback;
  const star = cd.match(/filename\*=(?:UTF-8''|)([^;]+)/i);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].replace(/^"(.*)"$/, "$1"));
    } catch {
      return fallback;
    }
  }
  const plain = cd.match(/filename="([^"]+)"/);
  return plain?.[1]?.trim() || fallback;
}

async function axiosErrorMessage(err: unknown): Promise<string> {
  const ax = err as AxiosError<Blob>;
  const data = ax.response?.data;
  if (data instanceof Blob) {
    const text = await data.text();
    try {
      const j = JSON.parse(text) as {
        error?: { message?: string };
        detail?: string | unknown;
      };
      const detail = j?.detail;
      if (typeof detail === "string") return detail;
      if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
      if (j?.error?.message) return j.error.message;
      return text.trim() || ax.message || "Request failed";
    } catch {
      return text.trim() || ax.message || "Request failed";
    }
  }
  return ax.message || "Request failed";
}

export async function autoFillExcel(
  file: File,
  options?: AutoFillOptions,
): Promise<AutoFillResult> {
  const formData = new FormData();
  formData.append("file", file);

  if (options?.model) formData.append("model", options.model);
  if (options?.contextColumns)
    formData.append("context_columns", options.contextColumns);
  if (options?.fillColumns) formData.append("fill_columns", options.fillColumns);

  try {
    const { data } = await apiClient.post<AutoFillResult>(`/v1/rfi/auto-fill`, formData);
    return data;
  } catch (e: unknown) {
    if (!axios.isAxiosError(e)) throw e as Error;
    const msg = await axiosErrorMessage(e);
    throw new Error(msg);
  }
}

export async function updateRfiCell(
  documentId: string,
  sheet: string,
  rowIdx: number,
  column: string,
  value: string
): Promise<void> {
  await apiClient.put(`/v1/rfi/${documentId}/update-cell`, {
    sheet,
    rowIdx,
    column,
    value,
  });
}

export async function exportRfiExcel(documentId: string): Promise<void> {
  try {
    const res = await apiClient.get<Blob>(`/v1/rfi/${documentId}/download`, {
      responseType: "blob",
    });
    const filename = parseContentDispositionFilename(
      res.headers["content-disposition"],
      `rfi_${documentId}.xlsx`
    );
    downloadBlob(res.data, filename);
  } catch (e) {
    console.error("Export failed", e);
    throw e;
  }
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
