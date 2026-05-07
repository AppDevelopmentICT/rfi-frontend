"use client";

import { useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

export function useStaleData<TData = unknown>(
  key: string,
  fetchFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData>, "queryKey" | "queryFn">
) {
  const queryClient = useQueryClient();
  const prevCountRef = useRef(0);

  const result = useQuery<TData>({
    queryKey: [key],
    queryFn: fetchFn,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    ...options,
  });

  useEffect(() => {
    if (result.isSuccess) {
      prevCountRef.current = (prevCountRef.current || 0) + 1;
    }
  }, [result.isSuccess, result.dataUpdatedAt]);

  const checkForUpdates = () => {
    queryClient.invalidateQueries({ queryKey: [key] });
  };

  return { ...result, checkForUpdates };
}
