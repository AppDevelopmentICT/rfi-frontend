import { NextRequest } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
const WS_BASE = API_URL.replace(/^http/, "ws").replace(/\/api$/, "");
const TOKEN =
  process.env.API_AUTH_SECRET ||
  process.env.NEXT_PUBLIC_API_AUTH_SECRET ||
  "super-secret-default-key-change-me";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const wsUrl = `${WS_BASE}/api/v1/rfp/ws/generate-technical?token=${encodeURIComponent(TOKEN)}`;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const ws = new WebSocket(wsUrl);

      ws.addEventListener("open", () => {
        ws.send(JSON.stringify(body));
      });

      ws.addEventListener("message", (event: MessageEvent) => {
        const text = typeof event.data === "string" ? event.data : "";
        controller.enqueue(encoder.encode(text + "\n"));
        try {
          const parsed = JSON.parse(text);
          if (parsed.type === "complete" || parsed.type === "error") {
            ws.close();
          }
        } catch {
          // skip
        }
      });

      ws.addEventListener("error", () => {
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              type: "error",
              message: "Failed to connect to generation service",
            }) + "\n"
          )
        );
        controller.close();
      });

      ws.addEventListener("close", () => {
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
