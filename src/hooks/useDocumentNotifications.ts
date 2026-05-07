"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function useDocumentNotifications(
  key: string,
  documentCountKey: string
) {
  const queryClient = useQueryClient();
  const prevCountRef = useRef<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const cached = queryClient.getQueryData<{ total?: number }>([key]);
      if (cached?.total !== undefined) {
        if (prevCountRef.current !== null && cached.total > prevCountRef.current) {
          toast.info("New document detected", {
            description: "A new document has been added. Refresh to see the latest data.",
            action: {
              label: "Refresh",
              onClick: () => {
                queryClient.invalidateQueries({ queryKey: [key] });
              },
            },
          });
        }
        prevCountRef.current = cached.total;
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [key, queryClient]);
}
