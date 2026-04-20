import { apiClient } from "@/lib/axios";

export interface IngestDocumentResponse {
  status: string;
  document_id: number;
  chunks_processed: number;
}

export async function ingestKnowledgeDocument(
  file: File
): Promise<IngestDocumentResponse> {
  const isMock = process.env.NEXT_PUBLIC_MOCK_API === "true";
  
  if (isMock) {
    // Artificial delay for local UI testing
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
