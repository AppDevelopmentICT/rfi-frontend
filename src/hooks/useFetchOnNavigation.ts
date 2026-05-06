"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export function useFetchOnNavigation<TData = unknown>(
  key: string,
  fetchFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData>, "queryKey" | "queryFn">
) {
  const [isNavigating, setIsNavigating] = useState(false);

  const result = useQuery<TData>({
    queryKey: [key, Date.now()],
    queryFn: fetchFn,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    ...options,
  });

  useEffect(() => {
    setIsNavigating(true);
    const timer = setTimeout(() => setIsNavigating(false), 300);
    return () => clearTimeout(timer);
  }, [key]);

  return { ...result, isNavigating };
}
