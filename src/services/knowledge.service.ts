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
  minio_key: string | null;
  created_at: string | null;
}

export interface ListDocumentsParams {
  search?: string;
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

export async function ingestKnowledgeDocument(
  file: File
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

  const { data } = await apiClient.post<IngestDocumentResponse>(
    "/v1/knowledge/ingest",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  
  return data;
}

export async function syncKnowledgeBase(): Promise<SyncResult> {
  const { data } = await apiClient.post<SyncResult>("/v1/knowledge/sync", null, {
    timeout: 600_000, // 10 min — sync downloads, parses, and embeds files
  });
  return data;
}

export async function listKnowledgeDocuments(
  params?: ListDocumentsParams
): Promise<ListDocumentsResponse> {
  const { data } = await apiClient.get<ListDocumentsResponse>("/v1/knowledge/documents", {
    params: {
      search: params?.search || undefined,
      sort_by: params?.sort_by || "created_at",
      sort_dir: params?.sort_dir || "desc",
      page: params?.page || 1,
      per_page: params?.per_page || 20,
    },
    timeout: 15_000,
  });
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

