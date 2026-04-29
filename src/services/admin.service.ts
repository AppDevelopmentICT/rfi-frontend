import { apiClient } from "@/lib/axios";
import type { RFIUser } from "@/services/rfi.service";

export interface AdminAuditLog {
  id: number;
  user: RFIUser | null;
  action: string;
  resource_type: string;
  document_id?: number | null;
  rfi_project_id?: number | null;
  rfp_project_id?: number | null;
  details: Record<string, unknown>;
  ip_address?: string | null;
  created_at: string;
}

export interface AuditLogResponse {
  items: AdminAuditLog[];
  page: number;
  page_size: number;
  total: number;
}

export interface AuditFilterOptions {
  actions: string[];
  resource_types: string[];
}

export async function listAdminUsers(): Promise<RFIUser[]> {
  const { data } = await apiClient.get<RFIUser[]>("/v1/admin/users");
  return data;
}

export async function setUserAdmin(userId: number, isAdmin: boolean): Promise<RFIUser> {
  const { data } = await apiClient.put<RFIUser>(`/v1/admin/users/${userId}/admin`, {
    is_admin: isAdmin,
  });
  return data;
}

export async function listAuditLogs(params: Record<string, string | number | undefined>) {
  const { data } = await apiClient.get<AuditLogResponse>("/v1/admin/audit-logs", {
    params,
  });
  return data;
}

export async function listAuditFilterOptions(): Promise<AuditFilterOptions> {
  const { data } = await apiClient.get<AuditFilterOptions>("/v1/admin/audit-actions");
  return data;
}

export interface AdminTrashItem {
  id: number;
  documentId: string;
  slug?: string | null;
  type: "rfi" | "rfp";
  status: string;
  is_deleted: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
  fileName?: string | null;
  filename?: string | null;
  product?: string | null;
  project_name?: string | null;
  owner?: RFIUser | null;
  deleted_by?: RFIUser | null;
}

export interface AdminTrashResponse {
  rfi: AdminTrashItem[];
  rfp: AdminTrashItem[];
}

export async function listAdminTrash(): Promise<AdminTrashResponse> {
  const { data } = await apiClient.get<AdminTrashResponse>("/v1/admin/trash");
  return data;
}

export async function listAdminProjects(params: {
  type?: "rfi" | "rfp";
  status?: string;
  include_deleted?: boolean;
} = {}): Promise<AdminTrashResponse> {
  const query: Record<string, string> = {};
  if (params.type) query.type = params.type;
  if (params.status) query.status = params.status;
  if (typeof params.include_deleted === "boolean") {
    query.include_deleted = params.include_deleted ? "true" : "false";
  }
  const { data } = await apiClient.get<AdminTrashResponse>("/v1/admin/projects", { params: query });
  return data;
}

export async function restoreAdminRfi(id: number): Promise<AdminTrashItem> {
  const { data } = await apiClient.post<AdminTrashItem>(`/v1/admin/rfi/${id}/restore`);
  return data;
}

export async function restoreAdminRfp(id: number): Promise<AdminTrashItem> {
  const { data } = await apiClient.post<AdminTrashItem>(`/v1/admin/rfp/${id}/restore`);
  return data;
}

export async function hardDeleteAdminRfi(id: number): Promise<void> {
  await apiClient.delete(`/v1/admin/rfi/${id}`);
}

export async function hardDeleteAdminRfp(id: number): Promise<void> {
  await apiClient.delete(`/v1/admin/rfp/${id}`);
}
