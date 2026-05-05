"use client";

import axios from "axios";
import { pb } from "@/lib/pocketbase";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/api",
  // Do NOT default Content-Type to application/json: with FormData, axios would
  // stringify the body as JSON instead of multipart (see axios transformRequest).
  headers: {},
});

apiClient.interceptors.request.use((config) => {
  if (process.env.NEXT_PUBLIC_AUTH_BYPASS === "true") {
    const bypassToken = process.env.NEXT_PUBLIC_API_AUTH_SECRET || "";
    if (bypassToken) {
      config.headers.Authorization = `Bearer ${bypassToken}`;
    }
    return config;
  }
  const token = pb.authStore.token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status && status >= 500) {
      const payload = error.response.data;
      // Blob payloads (e.g. responseType: "blob" with a JSON error) print as
      // "[object Blob]" — log the URL/status only and let the caller surface
      // the parsed message via its own error handling.
      if (payload instanceof Blob) {
        console.error(
          `[API Error] ${status} ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
        );
      } else {
        console.error(`[API Error] ${status}:`, payload);
      }
    }
    return Promise.reject(error);
  }
);
