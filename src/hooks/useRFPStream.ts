"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { pb } from "@/lib/pocketbase";

interface WSMessage {
  type: "chunk" | "complete" | "error" | "warning" | "info";
  content?: string;
  fullContent?: string;
  message?: string;
}

interface UseRFPStreamOptions {
  onChunk?: (chunk: string) => void;
  onComplete?: (fullContent: string) => void;
  onError?: (message: string) => void;
  onWarning?: (message: string) => void;
  onStart?: () => void;
}

function resolveWsBase(): string {
  const explicit = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim() || "http://127.0.0.1:8000/api";
  if (/^https?:\/\//i.test(apiUrl)) {
    return apiUrl
      .replace(/^http/i, (m) => (m.toLowerCase() === "https" ? "wss" : "ws"))
      .replace(/\/api\/?$/i, "")
      .replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}`;
  }
  return "ws://127.0.0.1:8000";
}

export function useRFPStream(options?: UseRFPStreamOptions) {
  const [isStreaming, setIsStreaming] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const optionsRef = useRef(options);
  const fullBufferRef = useRef<string>("");

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const cleanup = useCallback(() => {
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore close errors
      }
      wsRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const cancel = useCallback(() => {
    cleanup();
  }, [cleanup]);

  const sendPayload = useCallback(
    (payload: Record<string, unknown>) => {
      const token = pb.authStore.token;
      if (!token) {
        toast.error("Sign in required.");
        return;
      }
      cleanup();

      fullBufferRef.current = "";
      setIsStreaming(true);
      optionsRef.current?.onStart?.();

      const base = resolveWsBase();
      const url = `${base}/api/v1/rfp/ws/generate-technical?token=${encodeURIComponent(token)}`;

      let opened = false;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.addEventListener("open", () => {
        opened = true;
        ws.send(JSON.stringify(payload));
      });

      ws.addEventListener("message", (event: MessageEvent) => {
        const raw = typeof event.data === "string" ? event.data : "";
        if (!raw) return;
        let msg: WSMessage | null = null;
        try {
          msg = JSON.parse(raw) as WSMessage;
        } catch {
          msg = null;
        }
        if (!msg) return;

        switch (msg.type) {
          case "chunk":
            if (typeof msg.content === "string") {
              fullBufferRef.current += msg.content;
              optionsRef.current?.onChunk?.(msg.content);
            }
            break;
          case "complete": {
            const full = msg.fullContent ?? fullBufferRef.current;
            optionsRef.current?.onComplete?.(full);
            try {
              ws.close();
            } catch {
              // ignore
            }
            break;
          }
          case "warning":
            optionsRef.current?.onWarning?.(msg.message || "Warning");
            break;
          case "error":
            optionsRef.current?.onError?.(msg.message || "Generation error");
            toast.error(msg.message || "Generation error");
            try {
              ws.close();
            } catch {
              // ignore
            }
            break;
          case "info":
          default:
            // Informational frames; ignore
            break;
        }
      });

      ws.addEventListener("error", () => {
        optionsRef.current?.onError?.("Failed to connect to generation service");
        if (!opened) {
          toast.error("Could not reach the AI service. Is the backend running?");
        }
        cleanup();
      });

      ws.addEventListener("close", () => {
        wsRef.current = null;
        setIsStreaming(false);
      });
    },
    [cleanup],
  );

  const generate = useCallback(
    (
      product: string,
      extras?: {
        projectName?: string;
        projectDescription?: string;
        additionalContext?: string;
      },
    ) => {
      sendPayload({ product, rfp: true, ...extras });
    },
    [sendPayload],
  );

  const adjust = useCallback(
    (product: string, content: string, additionalContext: string) => {
      sendPayload({
        product,
        rfp: true,
        adjust: true,
        content,
        additionalContext,
      });
    },
    [sendPayload],
  );

  useEffect(() => () => cleanup(), [cleanup]);

  return { isStreaming, generate, adjust, cancel };
}
