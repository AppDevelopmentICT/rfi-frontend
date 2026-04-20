import axios from "axios";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to inject the Auth Bearer token
apiClient.interceptors.request.use((config) => {
  const token = process.env.NEXT_PUBLIC_API_AUTH_SECRET || "super-secret-default-key-change-me";
  if (config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status >= 500) {
      console.error(
        `[API Error] ${error.response.status}:`,
        error.response.data
      );
    }
    return Promise.reject(error);
  }
);
