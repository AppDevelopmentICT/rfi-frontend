import { apiClient } from "@/lib/axios";
import type { RFIUser } from "@/services/rfi.service";

export interface AdminAuditLog {
  id: number;
  user: RFIUser | null;
  action: string;
  resource_type: string;
  document_id?: number | null;
  rfi_project_id?: number | null;
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
