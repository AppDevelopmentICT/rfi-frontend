"use client";

import { useEffect, useRef, useCallback, useState } from "react";

interface UseRealtimePollingOptions {
  enabled?: boolean;
  intervalMs?: number;
  onNewData?: (data: unknown) => void;
}

export function useRealtimePolling<TData = unknown>(
  fetchFn: () => Promise<TData>,
  options: UseRealtimePollingOptions = {}
) {
  const { enabled = true, intervalMs = 5000, onNewData } = options;
  const [data, setData] = useState<TData | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const poll = useCallback(async () => {
    try {
      const result = await fetchFn();
      if (isMountedRef.current) {
        setData(result);
        onNewData?.(result);
      }
    } catch {
      // Silent fail for polling
    }
  }, [fetchFn, onNewData]);

  useEffect(() => {
    isMountedRef.current = true;
    let rafId = 0;

    if (enabled) {
      rafId = requestAnimationFrame(() => {
        void poll();
      });
      intervalRef.current = setInterval(poll, intervalMs);
    }

    return () => {
      isMountedRef.current = false;
      if (rafId) cancelAnimationFrame(rafId);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, intervalMs, poll]);

  return { data, isPolling: enabled };
}
