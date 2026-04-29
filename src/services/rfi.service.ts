import axios, { type AxiosError } from "axios";

import { apiClient } from "@/lib/axios";
import type { ExcelData } from "@/types/excel";

// ---------------------------------------------------------------------------
// POST /v1/rfi/read — upload Excel, get parsed sheets as JSON
// ---------------------------------------------------------------------------

export async function readExcel(file: File): Promise<ExcelData> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await apiClient.post<ExcelData>("/v1/rfi/read", formData);
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
  blob: Blob;
  /** Server summary from X-AutoFill-Message header */
  message?: string;
  /** Suggested filename from Content-Disposition (filled workbook) */
  filename: string;
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
  originalFileName: string,
  options?: AutoFillOptions,
): Promise<AutoFillResult> {
  const formData = new FormData();
  formData.append("file", file);

  if (options?.model) formData.append("model", options.model);
  if (options?.contextColumns)
    formData.append("context_columns", options.contextColumns);
  if (options?.fillColumns) formData.append("fill_columns", options.fillColumns);

  const fallbackName = `${originalFileName.replace(/\.[^.]+$/, "")}_answered.xlsx`;

  try {
    const res = await apiClient.post<Blob>("/v1/rfi/auto-fill", formData, {
      responseType: "blob",
    });

    const message =
      typeof res.headers["x-autofill-message"] === "string"
        ? res.headers["x-autofill-message"]
        : undefined;

    const filename = parseContentDispositionFilename(
      res.headers["content-disposition"],
      fallbackName,
    );

    return {
      blob: res.data,
      message,
      filename,
    };
  } catch (e: unknown) {
    if (!axios.isAxiosError(e)) throw e as Error;
    const msg = await axiosErrorMessage(e);
    throw new Error(msg);
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
