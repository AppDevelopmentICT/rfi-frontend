"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";

export function useFetchOnNavigation<TData = unknown>(
  key: string,
  fetchFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData>, "queryKey" | "queryFn">
) {
  return useQuery<TData>({
    queryKey: [key],
    queryFn: fetchFn,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    ...options,
  });
}
