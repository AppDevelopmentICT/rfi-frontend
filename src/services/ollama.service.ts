import { apiClient } from "@/lib/axios";

// ---------------------------------------------------------------------------
// GET /v1/rfi/models — fetch available Ollama models + default
// ---------------------------------------------------------------------------

export interface OllamaModelsResponse {
  models: string[];
  defaultModel: string;
}

/**
 * Fetch the list of available Ollama models and the server-configured default.
 *
 * The endpoint lives under `/v1/rfi/models` but is a shared Ollama utility
 * used by RFI, RFI-PDF, and RFP flows alike.
 */
export async function fetchOllamaModels(): Promise<OllamaModelsResponse> {
  const { data } = await apiClient.get<OllamaModelsResponse>("/v1/rfi/models");
  return data;
}
