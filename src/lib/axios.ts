"use client";

import axios, { type InternalAxiosRequestConfig } from "axios";
import { pb } from "@/lib/pocketbase";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/api",
  headers: {},
});

const _startTimes = new WeakMap<InternalAxiosRequestConfig, number>();

let _401Handled = false;

function _handle401() {
  if (_401Handled) return;
  _401Handled = true;
  console.warn("[Auth] 401 received — clearing session and redirecting to login");
  pb.authStore.clear();
  window.location.href = "/login";
}

apiClient.interceptors.request.use((config) => {
  const token = pb.authStore.token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  _startTimes.set(config, Date.now());
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    const ms = Date.now() - (_startTimes.get(response.config) ?? 0);
    const url = response.config?.url || "";
    const method = (response.config?.method || "").toUpperCase();
    if (ms > 5000) {
      console.info(`[API Slow] ${method} ${url} — ${ms}ms`);
    }
    if (response.status === 200 || response.status === 201) {
      _401Handled = false;
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";
    const method = (error.config?.method || "").toUpperCase();

    if (status === 401) {
      console.warn(`[API 401] ${method} ${url}`);
      _handle401();
      return Promise.reject(error);
    }

    if (status && status >= 500) {
      const payload = error.response.data;
      if (payload instanceof Blob) {
        console.error(
          `[API Error] ${status} ${method} ${url}`,
        );
      } else {
        console.error(`[API Error] ${status}:`, payload);
      }
    }
    return Promise.reject(error);
  }
);
