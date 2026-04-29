"use client";

import { useRef, useCallback, useEffect, useState } from "react";

import { pb } from "@/lib/pocketbase";
import { toast } from "sonner";

type WSStatus = "disconnected" | "connecting" | "connected";

interface WSMessage {
  type: "chunk" | "complete" | "error";
  content?: string;
  fullContent?: string;
  message?: string;
}

interface UseRFPWebSocketOptions {
  onChunk?: (chunk: string) => void;
  onComplete?: (fullContent: string) => void;
  onError?: (message: string) => void;
}

function buildWsUrl(): string {
  const token = pb.authStore.token;
  if (!token) {
    throw new Error("Not authenticated");
  }
  const configured = process.env.NEXT_PUBLIC_WS_URL;
  let base: string;
  if (configured) {
    base = configured.replace(/\/$/, "");
  } else if (typeof window !== "undefined") {
    const { protocol, host } = window.location;
    const wsProto = protocol === "https:" ? "wss:" : "ws:";
    base = `${wsProto}//${host}`;
  } else {
    base = "ws://127.0.0.1:8000";
  }
  return `${base}/api/v1/rfp/ws/generate-technical?token=${encodeURIComponent(token)}`;
}

export function useRFPWebSocket(options?: UseRFPWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<WSStatus>("disconnected");
  const mountedRef = useRef(true);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  });

  const connect = useCallback(() => {
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    if (!mountedRef.current) return;

    let url: string;
    try {
      url = buildWsUrl();
    } catch {
      toast.error("Sign in required for RFP workspace.");
      setStatus("disconnected");
      return;
    }

    setStatus("connecting");
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[RFP WS] Connected");
      if (mountedRef.current) setStatus("connected");
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
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
        console.error("[RFP WS] Failed to parse message");
      }
    };

    ws.onclose = (event) => {
      console.log("[RFP WS] Closed", event.code, event.reason);
      if (mountedRef.current) setStatus("disconnected");
      wsRef.current = null;
    };

    ws.onerror = (event) => {
      console.error("[RFP WS] Error", event);
      if (mountedRef.current) {
        setStatus("disconnected");
        toast.error("WebSocket connection failed — is the backend running?");
      }
    };
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus("disconnected");
  }, []);

  const generate = useCallback(
    (
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
      if (
        !wsRef.current ||
        wsRef.current.readyState !== WebSocket.OPEN
      ) {
        toast.error("WebSocket not connected. Reconnecting...");
        connect();
        return;
      }
      wsRef.current.send(
        JSON.stringify({
          product,
          rfp: true,
          ...extras,
        }),
      );
    },
    [connect],
  );

  const adjust = useCallback(
    (product: string, content: string, additionalContext: string) => {
      if (!pb.authStore.token) {
        toast.error("Sign in required.");
        return;
      }
      if (
        !wsRef.current ||
        wsRef.current.readyState !== WebSocket.OPEN
      ) {
        toast.error("WebSocket not connected. Reconnecting...");
        connect();
        return;
      }
      wsRef.current.send(
        JSON.stringify({
          product,
          rfp: true,
          adjust: true,
          content,
          additionalContext,
        }),
      );
    },
    [connect],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    status,
    connect,
    disconnect,
    generate,
    adjust,
  };
}
