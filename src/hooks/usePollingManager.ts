"use client";

import { useCallback, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { pb } from "@/lib/pocketbase";

export interface PollingTask {
  id: string;
  intervalMs: number;
  task: () => void | Promise<void>;
}

// ── globalThis-persisted state (survives HMR) ───────────────────────────────
// During Next.js hot-reload the module body re-evaluates, which would orphan
// any module-level setInterval.  By storing the timer ID and task registry on
// globalThis we guarantee exactly ONE master loop across the lifetime of the
// browser tab, regardless of how many HMR cycles occur.

interface PollingManagerState {
  tasks: Map<string, PollingTask>;
  nextRun: Map<string, number>;
}

interface PollingGlobals {
  __pollingState: PollingManagerState;
  __pollingIntervalId: ReturnType<typeof setInterval> | null;
  __pollingInitialized: boolean;
  __pollingAuthExpired: boolean;
}

declare global {
  var __pollingGlobals: PollingGlobals | undefined;
}

function _globals(): PollingGlobals {
  if (!globalThis.__pollingGlobals) {
    globalThis.__pollingGlobals = {
      __pollingState: { tasks: new Map(), nextRun: new Map() },
      __pollingIntervalId: null,
      __pollingInitialized: false,
      __pollingAuthExpired: false,
    };
  }
  return globalThis.__pollingGlobals;
}

const _MASTER_INTERVAL_MS = 5000;

function _isAuthError(err: unknown): boolean {
  if (err && typeof err === "object" && "response" in err) {
    const resp = (err as { response?: { status?: number } }).response;
    return resp?.status === 401;
  }
  return false;
}

function _clearMaster() {
  const g = _globals();
  if (g.__pollingIntervalId !== null) {
    clearInterval(g.__pollingIntervalId);
    g.__pollingIntervalId = null;
    g.__pollingInitialized = false;
  }
  g.__pollingState.tasks.clear();
  g.__pollingState.nextRun.clear();
}

function _handleAuthExpired() {
  const g = _globals();
  if (g.__pollingAuthExpired) return;
  g.__pollingAuthExpired = true;
  console.warn("[PollingManager] auth expired — clearing all tasks and redirecting");
  _clearMaster();
  pb.authStore.clear();
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

function _tick() {
  const g = _globals();
  if (g.__pollingAuthExpired) return;
  const now = Date.now();
  for (const [id, task] of g.__pollingState.tasks) {
    const next = g.__pollingState.nextRun.get(id) ?? 0;
    if (now >= next) {
      g.__pollingState.nextRun.set(id, now + task.intervalMs);
      try {
        const result = task.task();
        if (result && typeof result === "object" && "catch" in result) {
          (result as Promise<unknown>).catch((err: unknown) => {
            if (_isAuthError(err)) {
              console.warn(`[PollingManager] 401 detected for task ${id}, clearing session`);
              _handleAuthExpired();
            }
          });
        }
      } catch (err: unknown) {
        if (_isAuthError(err)) {
          console.warn(`[PollingManager] 401 detected for task ${id}, clearing session`);
          _handleAuthExpired();
        }
      }
    }
  }
}

function _ensureMaster() {
  const g = _globals();
  if (g.__pollingAuthExpired) return;

  // If an interval is already running (from a previous HMR iteration), clear it
  // before starting a new one.  This is the core HMR-leak fix.
  if (g.__pollingInitialized && g.__pollingIntervalId !== null) {
    clearInterval(g.__pollingIntervalId);
    g.__pollingIntervalId = null;
    g.__pollingInitialized = false;
  }

  if (g.__pollingInitialized) return;

  g.__pollingInitialized = true;
  g.__pollingIntervalId = setInterval(_tick, _MASTER_INTERVAL_MS);
}

export function registerPollingTask(task: PollingTask) {
  const g = _globals();
  if (g.__pollingAuthExpired) {
    console.warn(`[PollingManager] reject register "${task.id}" — auth expired`);
    return;
  }
  _ensureMaster();
  g.__pollingState.tasks.set(task.id, task);
  g.__pollingState.nextRun.set(task.id, Date.now() + task.intervalMs);
  console.debug(`[PollingManager] registered task "${task.id}" interval=${task.intervalMs}ms total=${g.__pollingState.tasks.size}`);
}

export function unregisterPollingTask(id: string) {
  const g = _globals();
  g.__pollingState.tasks.delete(id);
  g.__pollingState.nextRun.delete(id);
  console.debug(`[PollingManager] unregistered task "${id}" remaining=${g.__pollingState.tasks.size}`);
  if (g.__pollingState.tasks.size === 0) {
    _clearMaster();
  }
}

export function usePollingManager() {
  const queryClient = useQueryClient();

  const register = useCallback((task: PollingTask) => {
    registerPollingTask(task);
  }, []);

  const unregister = useCallback((id: string) => {
    unregisterPollingTask(id);
  }, []);

  // Cleanup on unmount — only clear the tasks that belong to this component.
  // The master interval is managed by globalThis, so we only do a lightweight
  // cleanup of task registrations, not the interval itself.
  useEffect(() => {
    return () => {
      const g = _globals();
      g.__pollingState.tasks.clear();
      g.__pollingState.nextRun.clear();
      if (g.__pollingIntervalId !== null) {
        clearInterval(g.__pollingIntervalId);
        g.__pollingIntervalId = null;
        g.__pollingInitialized = false;
      }
    };
  }, []);

  return { register, unregister, queryClient };
}

export function useJobPolling(
  jobId: string,
  intervalMs = 5000,
  onComplete?: (doc: unknown) => void,
  onFailed?: (error: string) => void
) {
  const onCompleteRef = useRef(onComplete);
  const onFailedRef = useRef(onFailed);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    onFailedRef.current = onFailed;
  }, [onComplete, onFailed]);

  useEffect(() => {
    if (!jobId) return;

    registerPollingTask({
      id: `job:${jobId}`,
      intervalMs,
      task: async () => {
        const { getRfiDocument } = await import("@/services/rfi.service");
        try {
          const doc = await getRfiDocument(jobId);
          if (doc.status === "completed") {
            unregisterPollingTask(`job:${jobId}`);
            onCompleteRef.current?.(doc);
          } else if (doc.status === "failed") {
            unregisterPollingTask(`job:${jobId}`);
            onFailedRef.current?.("Generation failed");
          }
        } catch (err: unknown) {
          if (_isAuthError(err)) {
            console.warn(`[useJobPolling] 401 for job ${jobId}, stopping polling`);
            unregisterPollingTask(`job:${jobId}`);
            _handleAuthExpired();
          }
        }
      },
    });

    return () => {
      unregisterPollingTask(`job:${jobId}`);
    };
  }, [jobId, intervalMs]);
}
