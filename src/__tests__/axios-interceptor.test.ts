import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AxiosAdapter } from "axios";

vi.mock("@/lib/pocketbase", () => ({
  pb: {
    authStore: {
      clear: vi.fn(),
      token: "fake-token",
    },
  },
}));

describe("axios interceptor - 401 handling", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("does not retry on 401", async () => {
    const mod = await import("@/lib/axios");
    const client = mod.apiClient;

    const mockAdapter = vi.fn().mockRejectedValue({
      response: { status: 401, data: "Unauthorized" },
      config: { url: "/v1/rfi/test", method: "get", metadata: {} },
      isAxiosError: true,
    });
    client.defaults.adapter = mockAdapter as unknown as AxiosAdapter;

    await expect(
      client.get("/v1/rfi/test").catch((e) => Promise.reject(e))
    ).rejects.toBeDefined();

    expect(mockAdapter).toHaveBeenCalledTimes(1);
  });

  it("handles 5xx differently from 401", async () => {
    const mod = await import("@/lib/axios");
    const client = mod.apiClient;

    const mockAdapter = vi.fn().mockRejectedValue({
      response: { status: 500, data: "Internal Server Error" },
      config: { url: "/v1/rfi/test", method: "get", metadata: {} },
      isAxiosError: true,
    });
    client.defaults.adapter = mockAdapter as unknown as AxiosAdapter;

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      client.get("/v1/rfi/test").catch((e) => Promise.reject(e))
    ).rejects.toBeDefined();

    expect(mockAdapter).toHaveBeenCalledTimes(1);
    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("[API 401]"),
      expect.anything()
    );

    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
