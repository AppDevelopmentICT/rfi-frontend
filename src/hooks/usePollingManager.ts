"use client";

import { useCallback, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { pb } from "@/lib/pocketbase";

export interface PollingTask {
  id: string;
  intervalMs: number;
  task: () => void | Promise<void>;
}

interface PollingManagerState {
  tasks: Map<string, PollingTask>;
  nextRun: Map<string, number>;
}

const _state: PollingManagerState = {
  tasks: new Map(),
  nextRun: new Map(),
};

const _masterIntervalMs = 5000;
let _intervalId: ReturnType<typeof setInterval> | null = null;
let _initialized = false;
let _authExpired = false;

function _isAuthError(err: unknown): boolean {
  if (
    err &&
    typeof err === "object" &&
    "response" in err
  ) {
    const resp = (err as { response?: { status?: number } }).response;
    return resp?.status === 401;
  }
  return false;
}

function _handleAuthExpired() {
  if (_authExpired) return;
  _authExpired = true;
  console.warn("[PollingManager] auth expired — clearing all tasks and redirecting");
  _clearMaster();
  pb.authStore.clear();
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

function _tick() {
  if (_authExpired) return;
  const now = Date.now();
  for (const [id, task] of _state.tasks) {
    const next = _state.nextRun.get(id) ?? 0;
    if (now >= next) {
      _state.nextRun.set(id, now + task.intervalMs);
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
  if (_authExpired || _initialized) return;
  _initialized = true;
  _intervalId = setInterval(_tick, _masterIntervalMs);
}

function _clearMaster() {
  if (_intervalId !== null) {
    clearInterval(_intervalId);
    _intervalId = null;
    _initialized = false;
  }
  _state.tasks.clear();
  _state.nextRun.clear();
}

export function registerPollingTask(task: PollingTask) {
  if (_authExpired) {
    console.warn(`[PollingManager] reject register "${task.id}" — auth expired`);
    return;
  }
  _ensureMaster();
  _state.tasks.set(task.id, task);
  _state.nextRun.set(task.id, Date.now() + task.intervalMs);
  console.debug(`[PollingManager] registered task "${task.id}" interval=${task.intervalMs}ms total=${_state.tasks.size}`);
}

export function unregisterPollingTask(id: string) {
  _state.tasks.delete(id);
  _state.nextRun.delete(id);
  console.debug(`[PollingManager] unregistered task "${id}" remaining=${_state.tasks.size}`);
  if (_state.tasks.size === 0) {
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

  useEffect(() => {
    return () => {
      _state.tasks.clear();
      _state.nextRun.clear();
      _clearMaster();
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
        const { useExcelStore } = await import("@/store/useExcelStore");
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
