"use client";

import { useCallback, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

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

function _tick() {
  const now = Date.now();
  for (const [id, task] of _state.tasks) {
    const next = _state.nextRun.get(id) ?? 0;
    if (now >= next) {
      _state.nextRun.set(id, now + task.intervalMs);
      try {
        task.task();
      } catch {
        // silent
      }
    }
  }
}

function _ensureMaster() {
  if (!_initialized) {
    _initialized = true;
    _intervalId = setInterval(_tick, _masterIntervalMs);
  }
}

function _clearMaster() {
  if (_intervalId !== null) {
    clearInterval(_intervalId);
    _intervalId = null;
    _initialized = false;
    _state.tasks.clear();
    _state.nextRun.clear();
  }
}

export function registerPollingTask(task: PollingTask) {
  _ensureMaster();
  _state.tasks.set(task.id, task);
  _state.nextRun.set(task.id, Date.now() + task.intervalMs);
}

export function unregisterPollingTask(id: string) {
  _state.tasks.delete(id);
  _state.nextRun.delete(id);
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
        } catch {
          // silent
        }
      },
    });

    return () => {
      unregisterPollingTask(`job:${jobId}`);
    };
  }, [jobId, intervalMs]);
}
