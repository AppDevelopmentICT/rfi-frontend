import { apiClient } from "@/lib/axios";

export interface DashboardStats {
  total_rfi: number;
  generated_rfi: number;
  active_documents: number;
}

export interface AuditLogEntry {
  id: number;
  action: string;
  resource_type: string;
  details: any;
  created_at: string;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data } = await apiClient.get<DashboardStats>("/v1/dashboard/stats");
  return data;
}

export async function getDashboardHistory(limit: number = 20): Promise<AuditLogEntry[]> {
  const { data } = await apiClient.get<AuditLogEntry[]>(`/v1/dashboard/history?limit=${limit}`);
  return data;
}

export async function logCustomEvent(action: string, resource_type: string, details?: any): Promise<void> {
  await apiClient.post("/v1/dashboard/log-event", { action, resource_type, details });
}
