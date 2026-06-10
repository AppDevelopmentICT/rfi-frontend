import { apiClient } from "@/lib/axios";
import type { RFIUser } from "@/services/rfi.service";

export interface RFPChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  created_at?: string;
  user?: {
    id: number | null;
    name?: string | null;
    email?: string | null;
  } | null;
}

export interface RFPProjectResponse {
  documentId: string;
  id: number;
  slug?: string | null;
  product: string;
  project_name?: string | null;
  project_description?: string | null;
  content: string;
  chat_messages: RFPChatMessage[];
  status: string;
  created_at?: string;
  updated_at?: string;
  user?: RFIUser | null;
  editing_user?: RFIUser | null;
  lock_acquired_at?: string | null;
  is_locked_by_other?: boolean;
  is_lock_held_by_me?: boolean;
  created?: boolean;
}

export interface RFPTimelineEntry {
  id: number;
  user: RFIUser | null;
  action: string;
  resource_type: string;
  details: Record<string, unknown>;
  created_at: string;
}

export async function createOrGetRfpProject(payload: {
  product: string;
  project_name?: string;
  project_description?: string;
}): Promise<RFPProjectResponse> {
  const { data } = await apiClient.post<RFPProjectResponse>("/v1/rfp/projects", payload);
  return data;
}

export async function getRfpProject(projectKey: string): Promise<RFPProjectResponse> {
  const { data } = await apiClient.get<RFPProjectResponse>(`/v1/rfp/projects/${projectKey}`);
  return data;
}

export async function listRfpProjects(params?: { include_deleted?: boolean }): Promise<RFPProjectResponse[]> {
  const { data } = await apiClient.get<RFPProjectResponse[]>("/v1/rfp/list", { params });
  return data;
}

export async function restoreRfpProject(projectKey: string): Promise<void> {
  await apiClient.post(`/v1/rfp/projects/${projectKey}/restore`);
}

export async function listMyRfpProjects(): Promise<RFPProjectResponse[]> {
  const { data } = await apiClient.get<RFPProjectResponse[]>("/v1/rfp/list/mine");
  return data;
}

export async function acquireRfpLock(projectKey: string): Promise<RFPProjectResponse> {
  const { data } = await apiClient.post<RFPProjectResponse>(`/v1/rfp/projects/${projectKey}/lock`);
  return data;
}

export async function releaseRfpLock(projectKey: string): Promise<RFPProjectResponse> {
  const { data } = await apiClient.delete<RFPProjectResponse>(`/v1/rfp/projects/${projectKey}/lock`);
  return data;
}

export async function saveRfpProject(
  projectKey: string,
  payload: { content: string; chat_messages?: RFPChatMessage[] }
): Promise<RFPProjectResponse> {
  const { data } = await apiClient.post<RFPProjectResponse>(`/v1/rfp/projects/${projectKey}/save`, payload);
  return data;
}

export async function appendRfpChat(
  projectKey: string,
  payload: Pick<RFPChatMessage, "role" | "content">
): Promise<RFPProjectResponse> {
  const { data } = await apiClient.post<RFPProjectResponse>(`/v1/rfp/projects/${projectKey}/chat`, payload);
  return data;
}

export async function getRfpTimeline(projectKey: string): Promise<RFPTimelineEntry[]> {
  const { data } = await apiClient.get<RFPTimelineEntry[]>(`/v1/rfp/projects/${projectKey}/timeline`);
  return data;
}

export async function queueRfpBackgroundGeneration(
  projectKey: string,
  payload: {
    adjust?: boolean;
    content?: string;
    additionalContext?: string;
    model?: string;
  },
): Promise<RFPProjectResponse> {
  const { data } = await apiClient.post<RFPProjectResponse>(
    `/v1/rfp/projects/${projectKey}/generate-background`,
    payload,
  );
  return data;
}

export async function softDeleteRfpProject(projectKey: string): Promise<void> {
  await apiClient.delete(`/v1/rfp/projects/${projectKey}`);
}
