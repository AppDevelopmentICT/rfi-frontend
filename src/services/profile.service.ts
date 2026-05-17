import { apiClient } from "@/lib/axios";
import { pb } from "@/lib/pocketbase";
import type { RecordModel } from "pocketbase";

export interface ProfileData {
  id: string;
  name?: string | null;
  email: string;
  avatar?: string;
  is_admin?: boolean;
  verified?: boolean;
  role?: string;
  department?: string;
  level?: string;
  grade?: string;
}

export interface ProfileResponse {
  id: string;
  pocketbase_id: string;
  email: string;
  name?: string | null;
  avatar_url?: string | null;
  is_admin: boolean;
  is_service_account: boolean;
  auth_method?: "password" | "oauth2" | "unknown";
  role?: string | null;
  department?: string | null;
  level?: string | null;
  grade?: string | null;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export async function fetchProfile(): Promise<ProfileResponse> {
  const { data } = await apiClient.get<ProfileResponse>("/v1/auth/profile");
  return data;
}

export async function updatePassword(body: ChangePasswordRequest): Promise<void> {
  await apiClient.post("/v1/auth/change-password", body);
}

export async function uploadAvatar(file: File): Promise<RecordModel> {
  const formData = new FormData();
  formData.append("avatar", file);

  return pb.collection("users").update(pb.authStore.record!.id, formData);
}

export function getAvatarUrl(record?: RecordModel | null, size = 200): string | undefined {
  if (!record?.id) return undefined;
  const field = record.avatar;
  if (typeof field === "string" && field.length > 0) {
    return pb.files.getURL(record, field, { thumb: `${size}x${size}` });
  }
  return undefined;
}
