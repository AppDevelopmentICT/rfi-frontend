"use client";

import { useRef, useCallback, useState } from "react";
import { toast } from "sonner";
import { pb } from "@/lib/pocketbase";

interface WSMessage {
  type: "chunk" | "complete" | "error";
  content?: string;
  fullContent?: string;
  message?: string;
}

interface UseRFPStreamOptions {
  onChunk?: (chunk: string) => void;
  onComplete?: (fullContent: string) => void;
  onError?: (message: string) => void;
}

function authHeaders(): HeadersInit {
  const t = pb.authStore.token;
  return {
    "Content-Type": "application/json",
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  };
}

export function useRFPStream(options?: UseRFPStreamOptions) {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const cancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const generate = useCallback(
    async (
      product: string,
      extras?: {
        projectName?: string;
        projectDescription?: string;
        additionalContext?: string;
      },
    ) => {
      if (!pb.authStore.token) {
        toast.error("Sign in required.");
        return;
      }
      cancel();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsStreaming(true);

      try {
        const res = await fetch("/api/v1/rfp/generate-technical", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ product, rfp: true, ...extras }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error(`Request failed: ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const msg: WSMessage = JSON.parse(line);
              switch (msg.type) {
                case "chunk":
                  if (msg.content) optionsRef.current?.onChunk?.(msg.content);
                  break;
                case "complete":
                  if (msg.fullContent)
                    optionsRef.current?.onComplete?.(msg.fullContent);
                  break;
                case "error":
                  optionsRef.current?.onError?.(msg.message || "Unknown error");
                  toast.error(msg.message || "Generation error");
                  break;
              }
            } catch {
              // skip malformed line
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          toast.error("Failed to connect to generation service");
          optionsRef.current?.onError?.("Connection failed");
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [cancel],
  );

  const adjust = useCallback(
    async (product: string, content: string, additionalContext: string) => {
      if (!pb.authStore.token) {
        toast.error("Sign in required.");
        return;
      }
      cancel();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsStreaming(true);

      try {
        const res = await fetch("/api/v1/rfp/generate-technical", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            product,
            rfp: true,
            adjust: true,
            content,
            additionalContext,
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error(`Request failed: ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const msg: WSMessage = JSON.parse(line);
              switch (msg.type) {
                case "chunk":
                  if (msg.content) optionsRef.current?.onChunk?.(msg.content);
                  break;
                case "complete":
                  if (msg.fullContent)
                    optionsRef.current?.onComplete?.(msg.fullContent);
                  break;
                case "error":
                  optionsRef.current?.onError?.(msg.message || "Unknown error");
                  toast.error(msg.message || "Generation error");
                  break;
              }
            } catch {
              // skip malformed line
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          toast.error("Failed to connect to generation service");
          optionsRef.current?.onError?.("Connection failed");
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [cancel],
  );

  return {
    isStreaming,
    generate,
    adjust,
    cancel,
  };
}
