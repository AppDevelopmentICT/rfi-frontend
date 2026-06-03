import { apiClient } from "@/lib/axios";

export interface IngestDocumentResponse {
  status: string;
  document_id: number;
  chunks_processed: number;
  docling_markdown?: string;
}

export interface SyncResult {
  status: string;
  added: Array<{ key: string; filename: string; document_id: number; chunks_processed: number }>;
  updated: Array<{ key: string; filename: string; document_id: number; chunks_processed: number }>;
  removed: Array<{ key: string; filename: string; document_id: number }>;
  unchanged: number;
  errors: Array<{ key: string; error: string }>;
  total_in_bucket: number;
  total_in_db: number;
}

export interface KBDocument {
  id: number;
  filename: string;
  status: string;
  source: "upload" | "minio";
  product?: string | null;
  minio_key: string | null;
  created_at: string | null;
}

export interface ListDocumentsParams {
  search?: string;
  product?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
  page?: number;
  per_page?: number;
}

export interface ListDocumentsResponse {
  documents: KBDocument[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface DeleteDocumentResponse {
  status: string;
  document_id: number;
  chunks_deleted: number;
}

export interface KBProduct {
  name: string;
  document_count: number;
}


function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function parsedMarkdownFilename(fileName: string): string {
  const stem = fileName.includes(".") ? fileName.slice(0, fileName.lastIndexOf(".")) : fileName;
  return `${stem}_parsed.md`;
}

export function downloadParsedMarkdown(markdown: string, fileName: string) {
  downloadBlob(new Blob([markdown], { type: "text/markdown;charset=utf-8" }), parsedMarkdownFilename(fileName));
}

export async function ingestKnowledgeDocument(
  file: File,
  product: string
): Promise<IngestDocumentResponse> {
  const isMock = process.env.NEXT_PUBLIC_MOCK_API === "true";
  
  if (isMock) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return {
      status: "success",
      document_id: Date.now(),
      chunks_processed: Math.floor(Math.random() * 20) + 1,
    };
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("product", product);

  const { data } = await apiClient.post<IngestDocumentResponse>(
    "/v1/knowledge/ingest",
    formData,
    { headers: { "Content-Type": "multipart/form-data" }, timeout: 1_800_000 }
  );
  
  return data;
}

export async function syncKnowledgeBase(): Promise<SyncResult> {
  const { data } = await apiClient.post<SyncResult>("/v1/knowledge/sync", null, {
    timeout: 1_800_000, // 30 min — sync downloads, parses, and embeds files
  });
  return data;
}

export async function listKnowledgeDocuments(
  params?: ListDocumentsParams
): Promise<ListDocumentsResponse> {
  const { data } = await apiClient.get<ListDocumentsResponse>("/v1/knowledge/documents", {
    params: {
      search: params?.search || undefined,
      product: params?.product || undefined,
      sort_by: params?.sort_by || "created_at",
      sort_dir: params?.sort_dir || "desc",
      page: params?.page || 1,
      per_page: params?.per_page || 20,
    },
    timeout: 15_000,
  });
  return data;
}

export async function listKnowledgeProducts(): Promise<KBProduct[]> {
  const { data } = await apiClient.get<KBProduct[]>("/v1/knowledge/products");
  return data;
}

export async function deleteKnowledgeDocument(
  documentId: number
): Promise<DeleteDocumentResponse> {
  const { data } = await apiClient.delete<DeleteDocumentResponse>(
    `/v1/knowledge/documents/${documentId}`
  );
  return data;
}

export interface BulkDeleteResponse {
  deleted: number;
  failed: Array<{ id: number; error: string }>;
}

export async function bulkDeleteKnowledgeDocuments(
  documentIds: number[]
): Promise<BulkDeleteResponse> {
  const { data } = await apiClient.post<BulkDeleteResponse>(
    "/v1/knowledge/documents/bulk-delete",
    { document_ids: documentIds }
  );
  return data;
}

export interface ConfigResponse {
  rag_development_mode: boolean;
}

export async function getKnowledgeConfig(): Promise<ConfigResponse> {
  const { data } = await apiClient.get<ConfigResponse>("/v1/knowledge/config");
  return data;
}

export async function downloadDocumentParsed(documentId: number, filename: string): Promise<void> {
  const { data } = await apiClient.get(`/v1/knowledge/documents/${documentId}/download-parsed`, {
    responseType: "blob",
    timeout: 30_000,
  });
  downloadBlob(data, parsedMarkdownFilename(filename));
}

export async function downloadDocumentChunks(documentId: number, filename: string): Promise<void> {
  const stem = filename.includes(".") ? filename.slice(0, filename.lastIndexOf(".")) : filename;
  const { data } = await apiClient.get(`/v1/knowledge/documents/${documentId}/download-chunks`, {
    responseType: "blob",
    timeout: 30_000,
  });
  downloadBlob(data, `${stem}_chunks.md`);
}

