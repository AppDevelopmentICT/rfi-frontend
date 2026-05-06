"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

export function useFetchOnNavigation<TData = unknown>(
  key: string,
  fetchFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData>, "queryKey" | "queryFn">
) {
  const [isNavigating, setIsNavigating] = useState(false);
  const [nonce, setNonce] = useState(0);

  const result = useQuery<TData>({
    queryKey: [key, nonce],
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
    setNonce((n) => n + 1);
    const timer = setTimeout(() => setIsNavigating(false), 300);
    return () => clearTimeout(timer);
  }, [key]);

  return { ...result, isNavigating };
}
