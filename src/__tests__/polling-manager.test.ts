import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/pocketbase", () => ({
  pb: {
    authStore: {
      clear: vi.fn(),
      token: "fake-token",
    },
  },
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));

let _state: { tasks: Map<string, unknown>; nextRun: Map<string, unknown> };
let _intervalId: ReturnType<typeof setInterval> | null;
let _initialized: boolean;
let _authExpired: boolean;

async function importModule() {
  vi.resetModules();
  vi.doMock("@/lib/pocketbase", () => ({
    pb: {
      authStore: {
        clear: vi.fn(),
        token: "fake-token",
      },
    },
  }));
  vi.doMock("@tanstack/react-query", () => ({
    useQueryClient: () => ({
      invalidateQueries: vi.fn(),
    }),
  }));
  return import("@/hooks/usePollingManager");
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("PollingManager", () => {
  it("registers a task and runs it on tick", async () => {
    const mod = await importModule();
    const taskFn = vi.fn();
    mod.registerPollingTask({ id: "test-1", intervalMs: 5000, task: taskFn });

    expect(taskFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(5000);
    expect(taskFn).toHaveBeenCalledTimes(1);

    mod.unregisterPollingTask("test-1");
  });

  it("runs multiple tasks in a single tick", async () => {
    const mod = await importModule();
    const fn1 = vi.fn();
    const fn2 = vi.fn();

    mod.registerPollingTask({ id: "a", intervalMs: 5000, task: fn1 });
    mod.registerPollingTask({ id: "b", intervalMs: 5000, task: fn2 });

    vi.advanceTimersByTime(5000);
    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);

    mod.unregisterPollingTask("a");
    mod.unregisterPollingTask("b");
  });

  it("unregistering last task clears master interval", async () => {
    const mod = await importModule();
    const fn = vi.fn();

    mod.registerPollingTask({ id: "last", intervalMs: 5000, task: fn });
    mod.unregisterPollingTask("last");

    vi.advanceTimersByTime(20000);
    expect(fn).not.toHaveBeenCalled();
  });

  it("stops all tasks on 401 error and clears auth", async () => {
    const mod = await importModule();
    const clearFn = vi.fn();
    const modPb = await import("@/lib/pocketbase");
    modPb.pb.authStore.clear = clearFn;

    const fn2 = vi.fn().mockRejectedValue(
      Object.assign(new Error("Unauthorized"), {
        response: { status: 401 },
      })
    );

    mod.registerPollingTask({ id: "fail", intervalMs: 5000, task: fn2 });

    await vi.advanceTimersByTimeAsync(5000);

    expect(clearFn).toHaveBeenCalled();
  });

  it("rejects new task registration after auth expired", async () => {
    const mod = await importModule();
    const modPb = await import("@/lib/pocketbase");
    const clearFn = vi.fn();
    modPb.pb.authStore.clear = clearFn;

    const failFn = vi.fn().mockRejectedValue(
      Object.assign(new Error("Unauthorized"), {
        response: { status: 401 },
      })
    );

    mod.registerPollingTask({ id: "trigger", intervalMs: 5000, task: failFn });

    await vi.advanceTimersByTimeAsync(5000);

    const newFn = vi.fn();
    mod.registerPollingTask({ id: "after-expire", intervalMs: 5000, task: newFn });

    await vi.advanceTimersByTimeAsync(20000);
    expect(newFn).not.toHaveBeenCalled();
  });

  it("does not tick after auth expired", async () => {
    const mod = await importModule();
    const clearFn = vi.fn();
    const modPb = await import("@/lib/pocketbase");
    modPb.pb.authStore.clear = clearFn;

    const fn = vi.fn().mockRejectedValue(
      Object.assign(new Error("Unauthorized"), {
        response: { status: 401 },
      })
    );

    mod.registerPollingTask({ id: "x", intervalMs: 5000, task: fn });

    await vi.advanceTimersByTimeAsync(5000);

    const callCount = clearFn.mock.calls.length;
    await vi.advanceTimersByTimeAsync(20000);

    expect(clearFn.mock.calls.length).toBe(callCount);
  });

  it("respects interval timing — task runs only when due", async () => {
    const mod = await importModule();
    const fn = vi.fn();

    mod.registerPollingTask({ id: "timed", intervalMs: 10000, task: fn });

    vi.advanceTimersByTime(3000);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(7000);
    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(5000);
    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(5000);
    expect(fn).toHaveBeenCalledTimes(2);

    mod.unregisterPollingTask("timed");
  });
});
