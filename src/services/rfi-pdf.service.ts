import { apiClient } from "@/lib/axios";
import { downloadBlob } from "@/services/rfi.service";

export type RFIPdfStatus =
  | "uploading"
  | "parsing"
  | "extracting"
  | "generating"
  | "drafting"
  | "ready"
  | "failed";

export interface RFIPdfUser {
  id: number;
  email: string;
  name?: string | null;
  avatar_url?: string | null;
  is_admin?: boolean;
}

export interface RFIPdfRequirement {
  id: string;
  category: "projects" | "engineers" | "company" | "general";
  prompt: string;
  projects?: string[];
  products?: string[];
  min_experience_years?: number | null;
  timeframe_years?: number | null;
}

export interface RFIPdfEntityRef {
  type: "project" | "engineer";
  refId: string | number;
  label: string;
  payload?: Record<string, unknown>;
  insertedAt: string;
}

export interface RFIPdfProjectResponse {
  documentId: string;
  id: number;
  slug: string | null;
  fileName: string;
  filename: string;
  status: RFIPdfStatus | string;
  error_message: string | null;
  title: string;
  summary: string | null;
  language: string;
  parsed_markdown: string;
  editor_markdown: string;
  editor_html: string;
  requirements: RFIPdfRequirement[];
  entity_refs: RFIPdfEntityRef[];
  metadata: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
  user: RFIPdfUser | null;
  uploaded_by: RFIPdfUser | null;
  editing_user: RFIPdfUser | null;
  lock_acquired_at: string | null;
  is_locked_by_other: boolean;
  is_lock_held_by_me: boolean;
}

export interface RFIPdfTimelineEntry {
  id: number;
  user: RFIPdfUser | null;
  action: string;
  resource_type: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface MasterProjectProduct {
  product_id: string | null;
  model: string | null;
  brand: string | null;
  serial_number: string | null;
}

export interface MasterProject {
  id: string;
  project_code: string | null;
  name: string;
  project_type: string | null;
  status: string | null;
  customer: { id: string | null; name: string | null };
  products: MasterProductRef[];
}

export type MasterProductRef = MasterProjectProduct;

export interface MasterProjectListResponse {
  items: MasterProject[];
  total: number;
  limit: number;
  offset: number;
}

export interface MasterEngineer {
  id: number;
  name: string | null;
  email: string;
  roles: string[];
  department: { id: string | null; name: string | null } | null;
  level: string | null;
  join_date: string | null;
  years_experience: number | null;
}

export interface MasterEngineerListResponse {
  items: MasterEngineer[];
  total: number;
  limit: number;
  offset: number;
}

export async function uploadRfiPdf(file: File): Promise<RFIPdfProjectResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post<RFIPdfProjectResponse>(
    "/v1/rfi-pdf/upload",
    formData,
  );
  return data;
}

export async function listRfiPdfs(): Promise<RFIPdfProjectResponse[]> {
  const { data } = await apiClient.get<RFIPdfProjectResponse[]>("/v1/rfi-pdf/list");
  return data;
}

export async function listMyRfiPdfs(): Promise<RFIPdfProjectResponse[]> {
  const { data } = await apiClient.get<RFIPdfProjectResponse[]>("/v1/rfi-pdf/list/mine");
  return data;
}

/** Browser WebSocket URL for live streamed AI draft markdown (authenticated via query token). */
export function buildRfiPdfDraftStreamUrl(documentId: string, token: string): string {
  const q = encodeURIComponent(token);
  const path = `/v1/rfi-pdf/ws/draft-stream/${encodeURIComponent(documentId)}?token=${q}`;

  const configured =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL
      ? String(process.env.NEXT_PUBLIC_API_URL).trim()
      : "";

  if (/^https?:\/\//i.test(configured)) {
    try {
      const normalized = configured.endsWith("/") ? configured : `${configured}/`;
      const u = new URL(normalized);
      const wsProto = u.protocol === "https:" ? "wss:" : "ws:";
      const pathname =
        u.pathname.endsWith("/") && u.pathname.length > 1
          ? u.pathname.slice(0, -1)
          : u.pathname;
      return `${wsProto}//${u.host}${pathname}${path}`;
    } catch {
      // Fall through to same-origin heuristic.
    }
  }

  if (typeof window !== "undefined") {
    const { protocol, host } = window.location;
    const wsProto = protocol === "https:" ? "wss:" : "ws:";
    return `${wsProto}//${host}/api${path}`;
  }

  return `ws://127.0.0.1:8000/api${path}`;
}

export async function getRfiPdf(documentId: string): Promise<RFIPdfProjectResponse> {
  const { data } = await apiClient.get<RFIPdfProjectResponse>(
    `/v1/rfi-pdf/${encodeURIComponent(documentId)}`,
  );
  return data;
}

export async function getRfiPdfTimeline(documentId: string): Promise<RFIPdfTimelineEntry[]> {
  const { data } = await apiClient.get<RFIPdfTimelineEntry[]>(
    `/v1/rfi-pdf/${encodeURIComponent(documentId)}/timeline`,
  );
  return data;
}

export async function lockRfiPdf(documentId: string): Promise<RFIPdfProjectResponse> {
  const { data } = await apiClient.post<RFIPdfProjectResponse>(
    `/v1/rfi-pdf/${encodeURIComponent(documentId)}/lock`,
  );
  return data;
}

export async function unlockRfiPdf(documentId: string): Promise<RFIPdfProjectResponse> {
  const { data } = await apiClient.delete<RFIPdfProjectResponse>(
    `/v1/rfi-pdf/${encodeURIComponent(documentId)}/lock`,
  );
  return data;
}

export interface SaveRfiPdfPayload {
  editor_markdown: string;
  editor_html?: string;
  entity_refs?: RFIPdfEntityRef[];
  metadata?: Record<string, unknown>;
}

export async function saveRfiPdf(
  documentId: string,
  payload: SaveRfiPdfPayload,
): Promise<RFIPdfProjectResponse> {
  const { data } = await apiClient.post<RFIPdfProjectResponse>(
    `/v1/rfi-pdf/${encodeURIComponent(documentId)}/save`,
    payload,
  );
  return data;
}

export async function regenerateRfiPdfDraft(
  documentId: string,
  payload: { model?: string; extra_instructions?: string },
): Promise<RFIPdfProjectResponse> {
  const { data } = await apiClient.post<RFIPdfProjectResponse>(
    `/v1/rfi-pdf/${encodeURIComponent(documentId)}/regenerate`,
    payload,
  );
  return data;
}

export async function getRfiPdfPreview(documentId: string): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(
    `/v1/rfi-pdf/${encodeURIComponent(documentId)}/preview`,
    { responseType: "blob" },
  );
  return data;
}

export async function exportRfiPdf(
  documentId: string,
  fallbackFilename = "rfi-response.pdf",
): Promise<void> {
  const res = await apiClient.post<Blob>(
    `/v1/rfi-pdf/${encodeURIComponent(documentId)}/export`,
    null,
    { responseType: "blob" },
  );
  const disposition = res.headers?.["content-disposition"] as string | undefined;
  const filename = parseFilename(disposition, fallbackFilename);
  downloadBlob(res.data, filename);
}

export async function softDeleteRfiPdf(documentId: string): Promise<void> {
  await apiClient.delete(`/v1/rfi-pdf/${encodeURIComponent(documentId)}`);
}

export async function stopRfiPdfGeneration(documentId: string): Promise<RFIPdfProjectResponse> {
  const { data } = await apiClient.post<RFIPdfProjectResponse>(
    `/v1/rfi-pdf/${encodeURIComponent(documentId)}/stop-generation`,
  );
  return data;
}

export async function listMasterProjects(params: {
  search?: string;
  product?: string;
  yearsBack?: number;
  limit?: number;
  offset?: number;
} = {}): Promise<MasterProjectListResponse> {
  const { data } = await apiClient.get<MasterProjectListResponse>(
    "/v1/rfi-pdf/master-data/projects",
    {
      params: {
        search: params.search || "",
        product: params.product || "",
        years_back: params.yearsBack,
        limit: params.limit ?? 50,
        offset: params.offset ?? 0,
      },
    },
  );
  return data;
}

export async function listMasterEngineers(params: {
  search?: string;
  role?: string;
  minExperienceYears?: number;
  limit?: number;
  offset?: number;
} = {}): Promise<MasterEngineerListResponse> {
  const { data } = await apiClient.get<MasterEngineerListResponse>(
    "/v1/rfi-pdf/master-data/engineers",
    {
      params: {
        search: params.search || "",
        role: params.role || "",
        min_experience_years: params.minExperienceYears,
        limit: params.limit ?? 50,
        offset: params.offset ?? 0,
      },
    },
  );
  return data;
}

function parseFilename(disposition: string | undefined, fallback: string): string {
  if (!disposition) return fallback;
  const star = disposition.match(/filename\*=(?:UTF-8'')?([^;]+)/i);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].replace(/^"(.*)"$/, "$1"));
    } catch {
      // fall through
    }
  }
  const plain = disposition.match(/filename="([^"]+)"/);
  return plain?.[1]?.trim() || fallback;
}
