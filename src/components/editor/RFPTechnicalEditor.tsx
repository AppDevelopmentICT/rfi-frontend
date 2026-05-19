"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Copy,
  Edit3,
  FileText,
  Lock,
  MessageSquare,
  Save,
  Send,
  ShieldAlert,
  Sparkles,
  Unlock,
  X,
  AlertTriangle,
  Loader2,
  History,
  PanelRightOpen,
  PanelRightClose,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import CharacterCount from "@tiptap/extension-character-count";

import { TipTapToolbar } from "./TipTapToolbar";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { RelativeTime } from "@/components/shared/RelativeTime";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { UserPill } from "@/components/shared/UserPill";
import { markdownToHtml } from "@/lib/markdown";
import { useRFPStream } from "@/hooks/useRFPStream";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import {
  acquireRfpLock,
  appendRfpChat,
  getRfpProject,
  getRfpTimeline,
  queueRfpBackgroundGeneration,
  releaseRfpLock,
  saveRfpProject,
  type RFPProjectResponse,
  type RFPTimelineEntry,
} from "@/services/rfp.service";

interface RFPTechnicalEditorProps {
  rfpId: string;
  autoGenerate?: boolean;
}

interface RFPTechnicalEditorInnerProps {
  /**
   * Fully-loaded project payload from the API. This component is only mounted
   * AFTER the parent has resolved data, so Tiptap can hydrate natively via
   * its `content` config (no `useEffect` + `setContent` hack needed).
   */
  initialProject: RFPProjectResponse;
  initialTimeline: RFPTimelineEntry[];
  rfpId: string;
  autoGenerate: boolean;
}

function actionLabel(action: string) {
  return action.replace(/^rfp\./, "").replace(/_/g, " ");
}

function timelineTitle(entry: RFPTimelineEntry) {
  const details = entry.details || {};
  if (typeof details.content === "string") return details.content.slice(0, 240);
  if (
    typeof details.project_name === "string" &&
    typeof details.product === "string"
  ) {
    return `${details.project_name}`;
  }
  return actionLabel(entry.action);
}

function getErrorMessage(error: unknown, fallback = "Request failed") {
  if (error instanceof Error) return error.message;
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: { data?: { detail?: unknown } } }).response
      ?.data?.detail === "string"
  ) {
    return String(
      (error as { response: { data: { detail: string } } }).response.data.detail
    );
  }
  return fallback;
}

interface LastGenerationRequest {
  adjust: boolean;
  content?: string;
  additionalContext?: string;
}

// =============================================================================
// PARENT: RFPTechnicalEditor (data fetcher / loading gate)
// =============================================================================
// This component does ONE job: load the RFP project + timeline from the API.
// It does NOT call `useEditor`. Only once `isLoading` is false AND `project`
// is non-null does it mount `RFPTechnicalEditorInner`, which is where Tiptap
// actually lives. Because the child only mounts after data is ready, the
// editor is initialized with the correct content on its very first paint —
// no hydration `useEffect`, no `setContent` race, no Strict-Mode misfires.
// =============================================================================
export function RFPTechnicalEditor({
  rfpId,
  autoGenerate = false,
}: RFPTechnicalEditorProps) {
  const [project, setProject] = useState<RFPProjectResponse | null>(null);
  const [timeline, setTimeline] = useState<RFPTimelineEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const [nextProject, nextTimeline] = await Promise.all([
          getRfpProject(rfpId),
          getRfpTimeline(rfpId),
        ]);
        if (cancelled) return;
        setProject(nextProject);
        setTimeline(nextTimeline);
      } catch (error: unknown) {
        if (!cancelled) {
          toast.error(getErrorMessage(error, "Failed to load RFP project"));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rfpId]);

  // STRICT loading guard. The inner editor (and `useEditor`) MUST NOT mount
  // until we have a real project payload in hand.
  if (isLoading || !project) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
        Loading RFP project...
      </div>
    );
  }

  return (
    <RFPTechnicalEditorInner
      // `key` ensures that if the user navigates between different RFPs,
      // the inner component (and the Tiptap editor inside it) is fully
      // remounted with the new initial content rather than trying to
      // re-sync imperatively.
      key={project.documentId}
      rfpId={rfpId}
      autoGenerate={autoGenerate}
      initialProject={project}
      initialTimeline={timeline}
    />
  );
}

// =============================================================================
// CHILD: RFPTechnicalEditorInner (owns the Tiptap editor + all interactions)
// =============================================================================
// At this point `initialProject` is guaranteed non-null. We pass its
// `.content` straight into `useEditor({ content: ... })` so Tiptap renders
// the saved HTML on first paint — natively, no imperative hacks.
// =============================================================================
function RFPTechnicalEditorInner({
  rfpId,
  autoGenerate,
  initialProject,
  initialTimeline,
}: RFPTechnicalEditorInnerProps) {
  const { user } = useAuth();
  const [project, setProject] = useState<RFPProjectResponse>(initialProject);
  const [timeline, setTimeline] =
    useState<RFPTimelineEntry[]>(initialTimeline);
  const [prompt, setPrompt] = useState("");
  // We are ALREADY loaded by the time this component mounts.
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const streamingContainerRef = useRef<HTMLDivElement>(null);
  const editorScrollPosRef = useRef<number>(0);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [isTimelineAccordionOpen, setIsTimelineAccordionOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  // Seed `projectRef` synchronously so handlers that read it (ensureLock,
  // queueBackgroundFallback, etc.) never see `null` during the first render.
  const projectRef = useRef<RFPProjectResponse | null>(initialProject);
  const isDirtyRef = useRef(false);
  const editorHydrateRef = useRef(false);
  const streamingActiveRef = useRef(false);
  const streamHasChunksRef = useRef(false);
  const autoGenerateStartedRef = useRef(false);
  const backgroundFallbackStartedRef = useRef(false);
  const lastGenerationRef = useRef<LastGenerationRequest | null>(null);

  // ---------------------------------------------------------------------------
  // Tiptap editor — initialized SYNCHRONOUSLY with the project's saved content.
  // Because this component is only mounted after the parent has resolved
  // `initialProject`, `initialProject.content` is the real saved HTML on the
  // very first render. Tiptap will paint it natively — no useEffect hydration,
  // no setContent-on-mount race, no Strict-Mode double-init issues.
  // ---------------------------------------------------------------------------
  const editor = useEditor({
    immediatelyRender: false,
    content: initialProject.content || "",
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: false,
        orderedList: false,
      }),
      Placeholder.configure({
        placeholder:
          "Chapter 3 (Product Details) will be written here. Use the chat panel on the right to create or customize the response.",
      }),
      Typography,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class:
            "text-blue-600 underline underline-offset-2 hover:text-blue-800",
        },
      }),
      CharacterCount.configure({
        limit: 50000,
      }),
    ],
    editable: true,
    editorProps: {
      attributes: {
        class:
          "outline-none min-h-[400px] px-1 prose prose-neutral max-w-none dark:prose-invert prose-headings:font-semibold prose-p:leading-relaxed prose-img:rounded-lg prose-img:border prose-img:border-border",
      },
    },
    onUpdate: () => {
      // `editorHydrateRef` is still used by IMPERATIVE setContent flows
      // triggered by explicit user actions (Cancel, stream-complete) — those
      // are not "user edits" and shouldn't mark the doc dirty. The initial
      // mount no longer needs suppression because we hydrate via the
      // `content` config instead of `setContent`.
      if (!editorHydrateRef.current && !streamingActiveRef.current) {
        isDirtyRef.current = true;
        setIsDirty(true);
      }
    },
  });

  // `refresh` is used for BACKGROUND POLLING (every 30s) and for explicit
  // re-syncs. It is NOT used for initial hydration — the parent already
  // handed us a fully-loaded `initialProject`, and Tiptap has already
  // initialized its content from it. The imperative `setContent` call inside
  // is intentional and safe: it only fires when the user is not currently
  // editing or streaming.
  const refresh = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      try {
        const [nextProject, nextTimeline] = await Promise.all([
          getRfpProject(rfpId),
          getRfpTimeline(rfpId),
        ]);
        projectRef.current = nextProject;
        setProject(nextProject);
        setTimeline(nextTimeline);
        if (editor && !isDirtyRef.current && !streamingActiveRef.current) {
          editorHydrateRef.current = true;
          editor.commands.setContent(nextProject.content || "");
          editorHydrateRef.current = false;
        }
      } catch (error: unknown) {
        toast.error(getErrorMessage(error, "Failed to load RFP project"));
      } finally {
        setIsLoading(false);
      }
    },
    [editor, rfpId]
  );

  // NOTE: We intentionally do NOT call `refresh()` on mount. The parent
  // already fetched the data and passed it in as `initialProject` /
  // `initialTimeline`. Calling `refresh()` here would re-fetch redundantly
  // and (worse) could race with the editor's native first-paint hydration.

  useEffect(() => {
    editor?.setEditable(isEditing && !project?.is_locked_by_other);
  }, [editor, isEditing, project?.is_locked_by_other]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [project?.chat_messages]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (
        globalThis.document.visibilityState === "visible" &&
        !streamingActiveRef.current
      ) {
        refresh(true);
      }
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!isDirty && !streamingActiveRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const queueBackgroundFallback = useCallback(async (reason: string) => {
    const current = projectRef.current;
    const last = lastGenerationRef.current;
    if (!current || !last || backgroundFallbackStartedRef.current) return;
    backgroundFallbackStartedRef.current = true;
    try {
      const queued = await queueRfpBackgroundGeneration(current.documentId, {
        adjust: last.adjust,
        content: last.content,
        additionalContext: last.additionalContext,
      });
      projectRef.current = queued;
      setProject(queued);
      setWarningMessage(null);
      toast.info(`RFP generation moved to background: ${reason}`);
    } catch (error: unknown) {
      toast.error(
        getErrorMessage(error, "Could not queue background generation")
      );
    }
  }, []);

  const stream = useRFPStream({
    onStart: () => {
      streamingActiveRef.current = true;
      streamHasChunksRef.current = false;
      setWarningMessage(null);
      setPendingMessage(null);
    },
    onWarning: (message) => {
      setWarningMessage(message);
      toast.warning(message);
    },
    onComplete: async (full) => {
      streamingActiveRef.current = false;
      lastGenerationRef.current = null;
      backgroundFallbackStartedRef.current = false;
      setPendingMessage(null);
      setIsAdjusting(false);
      setIsEditing(false);

      if (streamingContainerRef.current) {
        editorScrollPosRef.current = streamingContainerRef.current.scrollTop;
      }

      const html = markdownToHtml(full);
      if (editor) {
        editorHydrateRef.current = true;
        editor.commands.setContent(html);
        editorHydrateRef.current = false;
      }

      requestAnimationFrame(() => {
        const editorEl =
          document.querySelector<HTMLDivElement>(".tiptap")?.parentElement;
        if (editorEl) {
          editorEl.scrollTop = editorScrollPosRef.current;
        }
      });

      isDirtyRef.current = false;
      setIsDirty(false);
      const current = projectRef.current;
      if (!current) return;
      try {
        const summary = `Updated Bab 3 (${full.length.toLocaleString()} characters)`;
        const withAssistant = await appendRfpChat(current.documentId, {
          role: "assistant",
          content: summary,
        });
        const saved = await saveRfpProject(current.documentId, {
          content: html,
          chat_messages: withAssistant.chat_messages,
        });
        projectRef.current = saved;
        setProject(saved);
        toast.success("Response saved to project");
      } catch (error: unknown) {
        toast.error(
          getErrorMessage(error, "Generated content could not be saved")
        );
      }
    },
    onError: (message) => {
      streamingActiveRef.current = false;
      autoGenerateStartedRef.current = false;
      backgroundFallbackStartedRef.current = false;
      setPendingMessage(null);
      setIsAdjusting(false);
      setWarningMessage(null);
      toast.error(message);
    },
    onIncomplete: () => {
      streamingActiveRef.current = false;
      streamHasChunksRef.current = false;
      setPendingMessage(null);
      setIsAdjusting(false);
      setWarningMessage(null);
      toast.error("AI generation interrupted. Trying background fallback...");
      queueBackgroundFallback("connection lost");
    },
  });

  const streamingHtml = useMemo(
    () =>
      stream.streamingBuffer ? markdownToHtml(stream.streamingBuffer) : "",
    [stream.streamingBuffer]
  );

  useEffect(() => {
    if (stream.isStreaming) {
      const el = streamingContainerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [streamingHtml, stream.isStreaming]);

  useEffect(() => {
    if (!stream.isStreaming && streamingActiveRef.current) {
      streamingActiveRef.current = false;
      const el = streamingContainerRef.current;
      if (el) editorScrollPosRef.current = el.scrollTop;
      if (editor) {
        requestAnimationFrame(() => {
          const editorEl = document.querySelector(".tiptap")?.parentElement;
          if (editorEl && editorScrollPosRef.current > 0) {
            editorEl.scrollTop = Math.min(
              editorScrollPosRef.current,
              editorEl.scrollHeight
            );
          }
        });
      }
    }
  }, [stream.isStreaming, editor]);

  const isBusy = stream.isStreaming || isSaving;
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const messages = useMemo(() => {
    const base = project?.chat_messages || [];
    if (pendingMessage) {
      return [
        ...base,
        {
          role: "user" as const,
          content: pendingMessage,
          created_at: new Date().toISOString(),
          user: user
            ? { id: user.id, name: user.name, email: user.email }
            : null,
        },
      ];
    }
    return base;
  }, [project?.chat_messages, pendingMessage, user]);

  const ensureLock = useCallback(async () => {
    const current = projectRef.current;
    if (!current) throw new Error("RFP project is not loaded");
    if (current.is_lock_held_by_me) return current;
    const locked = await acquireRfpLock(current.documentId);
    projectRef.current = locked;
    setProject(locked);
    setIsEditing(true);
    return locked;
  }, []);

  const handleEdit = () => {
    const prevEditable = editor?.isEditable ?? true;
    setIsEditing(true);
    editor?.setEditable(true);

    ensureLock()
      .then(() => {
        toast.success("You can now edit this RFP");
      })
      .catch((error: unknown) => {
        setIsEditing(false);
        editor?.setEditable(prevEditable);
        toast.error(getErrorMessage(error, "Could not lock this RFP"));
      });
  };

  const handleCancel = async () => {
    if (!project) return;
    setIsCancelling(true);
    try {
      const released = await releaseRfpLock(project.documentId);
      projectRef.current = released;
      setProject(released);
      setIsEditing(false);
      isDirtyRef.current = false;
      setIsDirty(false);
      if (editor) {
        editorHydrateRef.current = true;
        editor.commands.setContent(released.content || "");
        editorHydrateRef.current = false;
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Could not release lock"));
    } finally {
      setIsCancelling(false);
    }
  };

  const handleSave = async () => {
    if (!project || !editor) return;
    setIsSaving(true);
    try {
      const saved = await saveRfpProject(project.documentId, {
        content: editor.getHTML(),
        chat_messages: project.chat_messages,
      });
      projectRef.current = saved;
      setProject(saved);
      setIsEditing(false);
      isDirtyRef.current = false;
      setIsDirty(false);
      toast.success("Changes saved");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Could not save changes"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleForceUnlock = async () => {
    if (!project) return;
    try {
      const released = await releaseRfpLock(project.documentId);
      projectRef.current = released;
      setProject(released);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Could not release lock"));
    }
  };

  const handleCopy = async () => {
    const text = editor?.getText() || "";
    if (!text.trim()) {
      toast.error("No response to copy yet");
      return;
    }
    await navigator.clipboard.writeText(text);
    toast.success("Response copied");
  };

  const handlePrompt = () => {
    const userPrompt = prompt.trim();
    if (!project || !userPrompt || isBusy) return;

    setPendingMessage(userPrompt);
    setPrompt("");

    const currentContent = editor?.getText().trim() || "";
    const product = (projectRef.current ?? project).product;

    if (currentContent) {
      lastGenerationRef.current = {
        adjust: true,
        content: currentContent,
        additionalContext: userPrompt,
      };
      backgroundFallbackStartedRef.current = false;
      setIsAdjusting(true);
      stream.adjust(product, currentContent, userPrompt);
    } else {
      lastGenerationRef.current = { adjust: false };
      backgroundFallbackStartedRef.current = false;
      setIsAdjusting(false);
      stream.generate(product);
    }

    (async () => {
      try {
        const locked = await ensureLock();
        const afterUser = await appendRfpChat(locked.documentId, {
          role: "user",
          content: userPrompt,
        });
        projectRef.current = afterUser;
        setProject(afterUser);
      } catch (error: unknown) {
        toast.error(getErrorMessage(error, "Could not save chat message"));
      }
    })();
  };

  const startInitialGeneration = useCallback(async () => {
    const current = projectRef.current;
    if (
      !current ||
      !editor ||
      stream.isStreaming ||
      autoGenerateStartedRef.current
    )
      return;
    if (current.content?.trim() || current.chat_messages?.length) return;
    autoGenerateStartedRef.current = true;
    try {
      const locked = await ensureLock();
      lastGenerationRef.current = { adjust: false };
      backgroundFallbackStartedRef.current = false;
      stream.generate(locked.product);
    } catch (error: unknown) {
      autoGenerateStartedRef.current = false;
      toast.error(
        getErrorMessage(error, "Could not start initial RFP generation")
      );
    }
  }, [editor, ensureLock, stream]);

  useEffect(() => {
    if (!autoGenerate || isLoading || !project) return;
    startInitialGeneration();
  }, [autoGenerate, isLoading, project, startInitialGeneration]);

  const lockMessage = useMemo(() => {
    if (!project?.is_locked_by_other || !project.editing_user) return null;
    const name = project.editing_user.name || project.editing_user.email;
    return `${name} is still updating the file. You can view it, but editing is disabled until they save changes.`;
  }, [project]);

  const renderTimelineItems = useCallback(() => {
    if (timeline.length === 0) {
      return (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No RFP activity yet.
        </p>
      );
    }
    return (
      <div className="space-y-3">
        {timeline.map((entry) => {
          const isPrompt = entry.action.endsWith("prompt");
          const isAssistant = entry.action.endsWith("assistant");
          const isLock = entry.action.includes("lock");
          const isSave = entry.action.endsWith("save");
          return (
            <div key={entry.id} className="relative pl-6">
              <span className="absolute left-1 top-3 h-full w-px bg-border" />
              <span
                className={cn(
                  "absolute left-0 top-2 size-3 rounded-full ring-4 ring-background",
                  isLock
                    ? "bg-muted-foreground/50"
                    : isPrompt
                    ? "bg-foreground/40"
                    : isAssistant
                    ? "bg-muted-foreground/60"
                    : isSave
                    ? "bg-foreground/30"
                    : "bg-muted-foreground"
                )}
              />
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <StatusBadge status={actionLabel(entry.action)} />
                    <p className="mt-2 text-sm font-medium">
                      {timelineTitle(entry)}
                    </p>
                  </div>
                  <RelativeTime
                    iso={entry.created_at}
                    className="shrink-0 text-xs text-muted-foreground"
                  />
                </div>
                <UserPill
                  className="mt-2"
                  name={entry.user?.name}
                  email={entry.user?.email}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }, [timeline]);

  // `project` is GUARANTEED non-null here (the parent gates on it before
  // mounting us). We only still wait on `editor` because Tiptap's
  // `useEditor({ immediatelyRender: false, ... })` returns `null` on the
  // very first render — but importantly, when it does become an instance
  // on the next render, it's already initialized with `initialProject.content`
  // via the `content` config above. So this branch only flashes for one
  // render at most, and never shows the placeholder.
  if (!editor) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
        Loading editor...
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-0 transition-all duration-300 ease-in-out",
        isPanelOpen ? "gap-3" : "gap-0"
      )}
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col transition-all duration-300 ease-in-out">
        <Card className="flex min-h-0 flex-1 flex-col rounded-none border-x-0 border-t-0 border-border/70 shadow-none">
          <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 border-b px-5 py-2">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-4 text-muted-foreground" />
                <span className="truncate">
                  {project.project_name || `${project.product} – Chapter 3`}
                </span>
                <StatusBadge status={project.status} />
              </CardTitle>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                Product:{" "}
                <span className="font-medium text-foreground">
                  {project.product}
                </span>
                {project.updated_at ? (
                  <>
                    {" · "}Updated{" "}
                    <RelativeTime iso={project.updated_at} className="inline" />
                  </>
                ) : null}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPanelOpen((v) => !v)}
                title={isPanelOpen ? "Focus mode" : "Show panel"}
              >
                {isPanelOpen ? (
                  <PanelRightClose className="size-4" />
                ) : (
                  <PanelRightOpen className="size-4" />
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="size-4" />
                Copy
              </Button>
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEdit}
                  disabled={Boolean(project.is_locked_by_other) || isBusy}
                >
                  <Edit3 className="size-4" />
                  Edit
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    disabled={isBusy || isCancelling}
                  >
                    {isCancelling ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <X className="size-4" />
                    )}
                    {isCancelling ? "Cancelling…" : "Cancel"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSave}
                    disabled={isBusy || !isDirty}
                  >
                    {isSaving ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    Save Changes
                  </Button>
                </>
              )}
              {project.is_locked_by_other && user?.is_admin ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleForceUnlock}
                >
                  <ShieldAlert className="size-4" />
                  Force Unlock
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="min-h-0 flex flex-1 flex-col overflow-hidden p-0">
            {lockMessage && (
              <div className="border-b bg-muted/30 px-4 py-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <div className="font-semibold text-foreground">
                      Editing locked
                    </div>
                    <p className="mt-0.5">{lockMessage}</p>
                  </div>
                </div>
              </div>
            )}
            {isEditing && !project.is_locked_by_other && (
              <div className="border-b bg-muted/30 px-4 py-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <Unlock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <div className="font-semibold text-foreground">
                      You are editing this RFP
                    </div>
                    <p className="mt-0.5">
                      Other users cannot edit it until you click Save Changes or
                      Cancel. Your next message in the chat will adjust this
                      content.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {warningMessage && (
              <div className="border-b bg-muted/30 px-4 py-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <div className="font-semibold">Knowledge base warning</div>
                    <p className="mt-0.5">{warningMessage}</p>
                  </div>
                </div>
              </div>
            )}
            {stream.isStreaming && (
              <div className="border-b bg-muted/30 px-4 py-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 animate-pulse text-muted-foreground" />
                  <span className="font-semibold text-foreground">
                    {isAdjusting
                      ? "AI is revising Chapter 3..."
                      : "AI is drafting Chapter 3..."}
                  </span>
                  <span className="ml-2 inline-flex items-center gap-1 text-muted-foreground">
                    <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60" />
                    <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:120ms]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:240ms]" />
                  </span>
                </div>
              </div>
            )}
            {isEditing && !stream.isStreaming && (
              <div className="border-b bg-muted/30 px-4 py-1">
                <TipTapToolbar editor={editor} />
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              {stream.isStreaming ? (
                <div
                  ref={streamingContainerRef}
                  className="prose prose-neutral max-w-none dark:prose-invert prose-headings:font-semibold prose-p:leading-relaxed prose-img:rounded-lg prose-img:border prose-img:border-border"
                  dangerouslySetInnerHTML={{ __html: streamingHtml }}
                />
              ) : (
                <EditorContent editor={editor} />
              )}
            </div>
            {isEditing && editor && (
              <div className="border-t px-4 py-1.5">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span>
                      {editor.storage.characterCount.characters()} characters
                    </span>
                    <span>{editor.storage.characterCount.words()} words</span>
                  </div>
                  {isDirty && (
                    <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                      <span className="size-1.5 rounded-full bg-amber-600 dark:bg-amber-400" />
                      <span>Unsaved changes</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div
        aria-hidden={!isPanelOpen}
        className={cn(
          "flex h-full min-h-0 shrink-0 flex-col gap-3 overflow-hidden transition-all duration-300 ease-in-out",
          isPanelOpen
            ? "w-[320px] opacity-100"
            : "w-0 opacity-0 pointer-events-none"
        )}
      >
        <Collapsible
          open={isChatOpen}
          onOpenChange={setIsChatOpen}
          className={cn(
            "flex flex-col rounded-lg border border-border/70 bg-card shadow-sm overflow-hidden transition-[flex-grow,flex-shrink,flex-basis,height] duration-300 ease-in-out",
            isChatOpen ? "flex-1 min-h-0" : "flex-none h-auto"
          )}
        >
          <CollapsibleTrigger className="group flex flex-row items-center justify-between gap-3 border-b px-3 py-2 text-left transition-colors hover:bg-muted/30">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="size-4 text-muted-foreground" />
              Chat
              {stream.isStreaming && (
                <Badge variant="secondary" className="gap-1">
                  <Loader2 className="size-3 animate-spin" />
                  Writing
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <p className="text-[11px] text-muted-foreground">
                RAG · {project.product}
              </p>
              <ChevronDown
                className={cn(
                  "size-4 text-muted-foreground transition-transform duration-200",
                  isChatOpen && "rotate-180"
                )}
              />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-4">
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto pr-1">
              {messages.length === 0 && (
                <div className="rounded-lg border border-dashed bg-muted/30 p-5 text-sm text-muted-foreground">
                  Ask the AI to draft Bab 3 (Detail Produk) for{" "}
                  <span className="font-semibold text-foreground">
                    {project.product}
                  </span>
                  . The response will stream into the editor and be saved
                  automatically.
                </div>
              )}
              {messages.map((message, index) => {
                const isOptimistic =
                  pendingMessage !== null &&
                  index === messages.length - 1 &&
                  message.role === "user" &&
                  message.content === pendingMessage;
                const isUser = message.role === "user";
                const isAssistant = message.role === "assistant";
                return (
                  <div
                    key={`${message.created_at || index}-${
                      message.role
                    }-${index}`}
                    className={cn(
                      "max-w-[85%] px-3 py-2 text-sm shadow-sm transition-all duration-300 ease-in-out",
                      isUser
                        ? // User: right-aligned, primary bg, sharp bottom-right corner
                          "self-end bg-primary text-primary-foreground rounded-2xl rounded-br-sm"
                        : isAssistant
                        ? // AI Assistant: left-aligned, muted bg, sharp top-left corner
                          "self-start bg-muted text-foreground rounded-2xl rounded-tl-sm border border-border/60"
                        : // System / fallback: centered neutral
                          "self-center bg-muted/40 text-muted-foreground rounded-2xl border border-dashed",
                      isOptimistic && "animate-pulse opacity-70"
                    )}
                  >
                    <div
                      className={cn(
                        "mb-1 text-[10px] uppercase tracking-wide",
                        isUser
                          ? "text-primary-foreground/80"
                          : "text-muted-foreground"
                      )}
                    >
                      {isUser
                        ? message.user?.name || "You"
                        : isAssistant
                        ? "AI Assistant"
                        : "System"}
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </p>
                    {message.created_at && (
                      <RelativeTime
                        iso={message.created_at}
                        className={cn(
                          "mt-1 block text-[10px]",
                          isUser
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        )}
                      />
                    )}
                  </div>
                );
              })}
              {stream.isStreaming && (
                <div className="self-start max-w-[85%] rounded-2xl rounded-tl-sm border border-border/60 bg-muted px-3 py-2 text-sm shadow-sm transition-all duration-300 ease-in-out">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Sparkles className="size-3.5" />
                    <span className="text-[11px] uppercase tracking-wide">
                      AI typing
                    </span>
                    <span className="ml-1 inline-flex items-center gap-1">
                      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
                      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:120ms]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:240ms]" />
                    </span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="border-t pt-3">
              <Textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handlePrompt();
                  }
                }}
                placeholder={
                  editor?.getText().trim()
                    ? "Ask for an adjustment..."
                    : "Generate Bab 3 detail produk..."
                }
                disabled={isBusy || Boolean(project.is_locked_by_other)}
                className="min-h-20 resize-none"
              />
              <div className="mt-2 flex items-center justify-end">
                <Button
                  variant="outline"
                  onClick={handlePrompt}
                  disabled={
                    !prompt.trim() ||
                    isBusy ||
                    Boolean(project.is_locked_by_other)
                  }
                  className="gap-2"
                >
                  {stream.isStreaming ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  Send
                </Button>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Enter to send · Shift+Enter for new line
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible
          open={isTimelineAccordionOpen}
          onOpenChange={setIsTimelineAccordionOpen}
          className={cn(
            "flex flex-col rounded-lg border border-border/70 bg-card shadow-sm overflow-hidden",
            // Animate ONLY `max-height` (single, GPU-friendly property).
            // `transition-all` and animating flex-grow/basis/height in parallel
            // caused layout re-entrancy → jitter. `max-height` interpolates
            // smoothly and clips overflow strictly, so the scrollbar can never
            // appear mid-animation to feed back into layout.
            "transition-[max-height] duration-300 ease-in-out will-change-[max-height]",
            isTimelineAccordionOpen
              ? "flex-1 min-h-0 max-h-[100vh]"
              : "flex-none max-h-12"
          )}
        >
          <CollapsibleTrigger className="group flex flex-row items-center justify-between gap-3 border-b px-3 py-2 text-left transition-colors hover:bg-muted/30">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-muted-foreground" />
              RFP Timeline
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Newest first
              </span>
              <span
                role="button"
                tabIndex={0}
                className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsTimelineOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    setIsTimelineOpen(true);
                  }
                }}
                title="Open full timeline"
              >
                <History className="size-4" />
                <span className="sr-only">Open full timeline</span>
              </span>
              <ChevronDown
                className={cn(
                  "size-4 text-muted-foreground transition-transform duration-200",
                  isTimelineAccordionOpen && "rotate-180"
                )}
              />
            </div>
          </CollapsibleTrigger>
          {/*
            Keep the Collapsible panel itself strictly `overflow-hidden`.
            Scrolling lives on the inner wrapper so a scrollbar appearing
            mid-animation cannot resize the panel and trigger a jitter loop.
            `scrollbar-gutter: stable` reserves the gutter to prevent
            sudden width changes when content overflows.
          */}
          <CollapsibleContent className="collapsible-panel min-h-0 flex-1 overflow-hidden">
            <div
              className="h-full w-full overflow-y-auto p-4 scrollbar-thin"
              style={{ scrollbarGutter: "stable" }}
            >
              {renderTimelineItems()}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <Sheet open={isTimelineOpen} onOpenChange={setIsTimelineOpen}>
        <SheetContent side="right" className="w-[92vw] sm:max-w-3xl p-0">
          <SheetHeader className="border-b">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-muted-foreground" />
              Full RFP Timeline
            </SheetTitle>
            <p className="text-xs text-muted-foreground">
              Complete activity trail (newest first)
            </p>
          </SheetHeader>
          <div className="h-[calc(100vh-5rem)] overflow-y-auto p-4">
            {renderTimelineItems()}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
