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
  onIncomplete?: (partialContent: string, reason: string) => void;
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
  const [streamingBuffer, setStreamingBuffer] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const optionsRef = useRef(options);
  const fullBufferRef = useRef<string>("");
  const settledRef = useRef(false);
  const intentionalCloseRef = useRef(false);
  const rafRef = useRef<number>(0);
  const pendingChunkRef = useRef<string>("");

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const flushBuffer = useCallback(() => {
    const pending = pendingChunkRef.current;
    if (!pending) return;
    pendingChunkRef.current = "";
    fullBufferRef.current += pending;
    setStreamingBuffer(fullBufferRef.current);
    optionsRef.current?.onChunk?.(pending);
  }, []);

  const scheduleFlush = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      flushBuffer();
    });
  }, [flushBuffer]);

  const cleanup = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    pendingChunkRef.current = "";
    if (wsRef.current) {
      try {
        intentionalCloseRef.current = true;
        wsRef.current.close();
      } catch {
        // ignore close errors
      }
      wsRef.current = null;
    }
    setIsStreaming(false);
    setStreamingBuffer("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      pendingChunkRef.current = "";
      settledRef.current = false;
      intentionalCloseRef.current = false;
      setIsStreaming(true);
      setStreamingBuffer("");
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
              pendingChunkRef.current += msg.content;
              scheduleFlush();
            }
            break;
          case "complete": {
            if (rafRef.current) {
              cancelAnimationFrame(rafRef.current);
              rafRef.current = 0;
            }
            if (pendingChunkRef.current) {
              flushBuffer();
            }
            settledRef.current = true;
            const full = msg.fullContent ?? fullBufferRef.current;
            setStreamingBuffer(full);
            optionsRef.current?.onComplete?.(full);
            try {
              intentionalCloseRef.current = true;
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
            settledRef.current = true;
            optionsRef.current?.onError?.(msg.message || "Generation error");
            toast.error(msg.message || "Generation error");
            try {
              intentionalCloseRef.current = true;
              ws.close();
            } catch {
              // ignore
            }
            break;
          case "info":
          default:
            break;
        }
      });

      ws.addEventListener("error", () => {
        settledRef.current = true;
        optionsRef.current?.onError?.("Failed to connect to generation service");
        if (!opened) {
          toast.error("Could not reach the AI service. Is the backend running?");
        }
        cleanup();
      });

      ws.addEventListener("close", () => {
        if (!settledRef.current && !intentionalCloseRef.current) {
          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = 0;
          }
          if (pendingChunkRef.current) {
            flushBuffer();
          }
          optionsRef.current?.onIncomplete?.(
            fullBufferRef.current,
            "WebSocket closed before complete",
          );
        }
        wsRef.current = null;
        setIsStreaming(false);
        setStreamingBuffer("");
      });
    },
    [cleanup, flushBuffer, scheduleFlush],
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

  return { isStreaming, streamingBuffer, generate, adjust, cancel };
}
