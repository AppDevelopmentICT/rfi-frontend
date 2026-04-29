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
  Lightbulb,
  ZoomIn,
} from "lucide-react";
import { toast } from "sonner";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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

function actionLabel(action: string) {
  return action.replace(/^rfp\./, "").replace(/_/g, " ");
}

function timelineTitle(entry: RFPTimelineEntry) {
  const details = entry.details || {};
  if (typeof details.content === "string") return details.content.slice(0, 240);
  if (typeof details.project_name === "string" && typeof details.product === "string") {
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
    typeof (error as { response?: { data?: { detail?: unknown } } }).response?.data?.detail === "string"
  ) {
    return String((error as { response: { data: { detail: string } } }).response.data.detail);
  }
  return fallback;
}

interface LastGenerationRequest {
  adjust: boolean;
  content?: string;
  additionalContext?: string;
}

export function RFPTechnicalEditor({ rfpId, autoGenerate = false }: RFPTechnicalEditorProps) {
  const { user } = useAuth();
  const [project, setProject] = useState<RFPProjectResponse | null>(null);
  const [timeline, setTimeline] = useState<RFPTimelineEntry[]>([]);
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [streamingChunks, setStreamingChunks] = useState("");
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const projectRef = useRef<RFPProjectResponse | null>(null);
  const editorHydrateRef = useRef(false);
  const streamingActiveRef = useRef(false);
  const streamHasChunksRef = useRef(false);
  const autoGenerateStartedRef = useRef(false);
  const backgroundFallbackStartedRef = useRef(false);
  const lastGenerationRef = useRef<LastGenerationRequest | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({
        placeholder:
          "Bab 3 (Detail Produk) akan ditulis di sini. Gunakan panel chat di kanan untuk membuat atau menyesuaikan responsnya.",
      }),
      Typography,
    ],
    editable: false,
    editorProps: {
      attributes: {
        class:
          "outline-none min-h-full prose prose-sm prose-neutral max-w-none dark:prose-invert prose-headings:font-semibold prose-p:leading-relaxed",
      },
    },
    onUpdate: () => {
      if (!editorHydrateRef.current && !streamingActiveRef.current) {
        setIsDirty(true);
      }
    },
  });

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
        setIsEditing(Boolean(nextProject.is_lock_held_by_me));
        if (editor && !isDirty && !streamingActiveRef.current) {
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
    [editor, isDirty, rfpId],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  useEffect(() => {
    editor?.setEditable(isEditing && !project?.is_locked_by_other);
  }, [editor, isEditing, project?.is_locked_by_other]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [project?.chat_messages, streamingChunks]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (globalThis.document.visibilityState === "visible" && !streamingActiveRef.current) {
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

  const queueBackgroundFallback = useCallback(
    async (reason: string) => {
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
        toast.info(`RFP generation moved to background: ${reason}`);
        await refresh(true);
      } catch (error: unknown) {
        toast.error(getErrorMessage(error, "Could not queue background generation"));
      }
    },
    [refresh],
  );

  const stream = useRFPStream({
    onStart: () => {
      streamingActiveRef.current = true;
      streamHasChunksRef.current = false;
      setStreamingChunks("");
      setWarningMessage(null);
    },
    onChunk: (chunk) => {
      setStreamingChunks((prev) => {
        const next = prev + chunk;
        if (editor) {
          streamHasChunksRef.current = true;
          editorHydrateRef.current = true;
          editor.commands.setContent(markdownToHtml(next));
          editorHydrateRef.current = false;
        }
        return next;
      });
    },
    onWarning: (message) => {
      setWarningMessage(message);
      toast.warning(message);
    },
    onComplete: async (full) => {
      streamingActiveRef.current = false;
      lastGenerationRef.current = null;
      backgroundFallbackStartedRef.current = false;
      const html = markdownToHtml(full);
      if (editor) {
        editorHydrateRef.current = true;
        editor.commands.setContent(html);
        editorHydrateRef.current = false;
      }
      setStreamingChunks("");
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
        setIsEditing(false);
        await refresh(true);
        toast.success("Response saved to project");
      } catch (error: unknown) {
        toast.error(getErrorMessage(error, "Generated content could not be saved"));
      }
    },
    onError: (message) => {
      streamingActiveRef.current = false;
      streamHasChunksRef.current = false;
      toast.error(message || "Generation failed");
      queueBackgroundFallback("connection error");
    },
    onIncomplete: (_partialContent, reason) => {
      streamingActiveRef.current = false;
      streamHasChunksRef.current = false;
      queueBackgroundFallback(reason);
    },
  });

  const isBusy = stream.isStreaming || isSaving;
  const messages = useMemo(() => project?.chat_messages || [], [project?.chat_messages]);

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

  const handleEdit = async () => {
    try {
      await ensureLock();
      toast.success("You can now edit this RFP");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Could not lock this RFP"));
    }
  };

  const handleCancel = async () => {
    if (!project) return;
    try {
      const released = await releaseRfpLock(project.documentId);
      projectRef.current = released;
      setProject(released);
      setIsEditing(false);
      setIsDirty(false);
      if (editor) {
        editorHydrateRef.current = true;
        editor.commands.setContent(released.content || "");
        editorHydrateRef.current = false;
      }
      await refresh(true);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Could not release lock"));
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
      setIsDirty(false);
      await refresh(true);
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
      await refresh(true);
      toast.success("Lock released");
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

  const handlePrompt = async () => {
    const userPrompt = prompt.trim();
    if (!project || !userPrompt || isBusy) return;
    try {
      const locked = await ensureLock();
      const afterUser = await appendRfpChat(locked.documentId, {
        role: "user",
        content: userPrompt,
      });
      projectRef.current = afterUser;
      setProject(afterUser);
      setPrompt("");
      const currentContent = editor?.getText().trim() || "";
      if (currentContent) {
        lastGenerationRef.current = {
          adjust: true,
          content: currentContent,
          additionalContext: userPrompt,
        };
        backgroundFallbackStartedRef.current = false;
        stream.adjust(locked.product, currentContent, userPrompt);
      } else {
        lastGenerationRef.current = { adjust: false };
        backgroundFallbackStartedRef.current = false;
        stream.generate(locked.product);
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Could not send prompt"));
    }
  };

  const startInitialGeneration = useCallback(async () => {
    const current = projectRef.current;
    if (!current || !editor || stream.isStreaming || autoGenerateStartedRef.current) return;
    if (current.content?.trim() || current.chat_messages?.length) return;
    autoGenerateStartedRef.current = true;
    try {
      const locked = await ensureLock();
      lastGenerationRef.current = { adjust: false };
      backgroundFallbackStartedRef.current = false;
      stream.generate(locked.product);
    } catch (error: unknown) {
      autoGenerateStartedRef.current = false;
      toast.error(getErrorMessage(error, "Could not start initial RFP generation"));
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
                    ? "bg-amber-500"
                    : isPrompt
                      ? "bg-blue-500"
                      : isAssistant
                        ? "bg-purple-500"
                        : isSave
                          ? "bg-emerald-500"
                          : "bg-primary",
                )}
              />
              <div className="rounded-lg border bg-card p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <StatusBadge status={actionLabel(entry.action)} />
                    <p className="mt-2 text-sm font-medium">{timelineTitle(entry)}</p>
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

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
        Loading RFP project...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        RFP project not found.
      </div>
    );
  }

  return (
    <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="flex min-h-0 min-w-0 flex-col">
        <Card className="flex min-h-0 flex-1 flex-col border-border/70 shadow-sm">
          <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 border-b py-3">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-4 text-primary" />
                <span className="truncate">
                  {project.project_name || `${project.product} – Chapter 3`}
                </span>
                <StatusBadge status={project.status} />
              </CardTitle>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                Product:{" "}
                <span className="font-medium text-foreground">{project.product}</span>
                {project.updated_at ? (
                  <>
                    {" · "}Updated <RelativeTime iso={project.updated_at} className="inline" />
                  </>
                ) : null}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="size-4" />
                Copy
              </Button>
              {!isEditing ? (
                <Button
                  size="sm"
                  onClick={handleEdit}
                  disabled={Boolean(project.is_locked_by_other) || isBusy}
                >
                  <Edit3 className="size-4" />
                  Edit
                </Button>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={handleCancel} disabled={isBusy}>
                    <X className="size-4" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={isBusy || !isDirty}>
                    {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    Save Changes
                  </Button>
                </>
              )}
              {project.is_locked_by_other && user?.is_admin ? (
                <Button variant="destructive" size="sm" onClick={handleForceUnlock}>
                  <ShieldAlert className="size-4" />
                  Force Unlock
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="min-h-0 flex flex-1 flex-col overflow-hidden p-0">
            {lockMessage && (
              <div className="border-b bg-amber-50 px-5 py-3 text-sm text-amber-900">
                <div className="flex items-start gap-2">
                  <Lock className="mt-0.5 size-4 shrink-0" />
                  <div>
                    <div className="font-semibold">Editing locked</div>
                    <p className="mt-0.5">{lockMessage}</p>
                  </div>
                </div>
              </div>
            )}
            {isEditing && !project.is_locked_by_other && (
              <div className="border-b bg-blue-50 px-5 py-3 text-sm text-blue-900">
                <div className="flex items-start gap-2">
                  <Unlock className="mt-0.5 size-4 shrink-0" />
                  <div>
                    <div className="font-semibold">You are editing this RFP</div>
                    <p className="mt-0.5">
                      Other users cannot edit it until you click Save Changes or Cancel. Your
                      next message in the chat will adjust this content.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {warningMessage && (
              <div className="border-b bg-amber-50 px-5 py-3 text-sm text-amber-900">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <div>
                    <div className="font-semibold">Knowledge base warning</div>
                    <p className="mt-0.5">{warningMessage}</p>
                  </div>
                </div>
              </div>
            )}
            {stream.isStreaming && (
              <div className="border-b bg-purple-50 px-5 py-3 text-sm text-purple-900">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 animate-pulse text-purple-600" />
                  <span className="font-semibold">AI is writing Chapter 3 in Indonesian...</span>
                  <span className="ml-2 inline-flex items-center gap-1 text-purple-700">
                    <span className="size-1.5 animate-bounce rounded-full bg-purple-500" />
                    <span className="size-1.5 animate-bounce rounded-full bg-purple-500 [animation-delay:120ms]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-purple-500 [animation-delay:240ms]" />
                  </span>
                </div>
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <EditorContent editor={editor} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex min-h-0 flex-col gap-4">
        <Card className="flex h-[56vh] min-h-[420px] max-h-[62vh] flex-col border-border/70 shadow-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0 border-b py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="size-4 text-primary" />
              Chat
              {stream.isStreaming && (
                <Badge variant="secondary" className="gap-1">
                  <Loader2 className="size-3 animate-spin" />
                  Writing
                </Badge>
              )}
            </CardTitle>
            <p className="text-[11px] text-muted-foreground">RAG · {project.product}</p>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3">
            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {messages.length === 0 && (
              <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
                Ask the AI to draft Bab 3 (Detail Produk) for{" "}
                <span className="font-semibold text-foreground">{project.product}</span>. The
                response will stream into the editor and be saved automatically.
              </div>
            )}
            {messages.map((message, index) => (
              <div
                key={`${message.created_at || index}-${message.role}`}
                className={cn(
                  "rounded-2xl px-3 py-2 text-sm",
                  message.role === "user"
                    ? "ml-6 bg-primary text-primary-foreground"
                    : "mr-6 border bg-muted/40",
                )}
              >
                <div
                  className={cn(
                    "mb-1 text-[10px] uppercase tracking-wide",
                    message.role === "user"
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground",
                  )}
                >
                  {message.role === "user"
                    ? message.user?.name || "You"
                    : message.role === "assistant"
                      ? "AI Assistant"
                      : "System"}
                </div>
                <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                {message.created_at && (
                  <RelativeTime
                    iso={message.created_at}
                    className={cn(
                      "mt-1 block text-[10px]",
                      message.role === "user"
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground",
                    )}
                  />
                )}
              </div>
            ))}
              {stream.isStreaming && (
                <div className="mr-6 rounded-2xl border bg-muted/40 px-3 py-2 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Sparkles className="size-3.5" />
                    <span className="text-[11px] uppercase tracking-wide">AI typing</span>
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
                    ? "Ask for an adjustment (Indonesian)..."
                    : "Generate Bab 3 detail produk in Indonesian..."
                }
                disabled={isBusy || Boolean(project.is_locked_by_other)}
                className="min-h-20 resize-none"
              />
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-xs"
                  onClick={() =>
                    setPrompt(
                      `Buat Bab 3 detail produk untuk ${project.product} dalam Bahasa Indonesia, sesuai dokumen pengetahuan.`,
                    )
                  }
                  disabled={isBusy || Boolean(project.is_locked_by_other)}
                >
                  <Lightbulb className="size-3.5" />
                  Suggest
                </Button>
                <Button
                  onClick={handlePrompt}
                  disabled={!prompt.trim() || isBusy || Boolean(project.is_locked_by_other)}
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
          </CardContent>
        </Card>

        <Card className="flex min-h-0 flex-1 flex-col border-border/70 shadow-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0 border-b py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-purple-600" />
              RFP Timeline
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Newest first</span>
              <Button
                variant="outline"
                size="icon-sm"
                className="size-7"
                onClick={() => setIsTimelineOpen(true)}
                title="Open full timeline"
              >
                <ZoomIn className="size-4" />
                <span className="sr-only">Open full timeline</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-y-auto p-4">
            {renderTimelineItems()}
          </CardContent>
        </Card>
      </div>

      <Sheet open={isTimelineOpen} onOpenChange={setIsTimelineOpen}>
        <SheetContent side="right" className="w-[92vw] sm:max-w-3xl p-0">
          <SheetHeader className="border-b">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-purple-600" />
              Full RFP Timeline
            </SheetTitle>
            <p className="text-xs text-muted-foreground">Complete activity trail (newest first)</p>
          </SheetHeader>
          <div className="h-[calc(100vh-5rem)] overflow-y-auto p-4">
            {renderTimelineItems()}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
