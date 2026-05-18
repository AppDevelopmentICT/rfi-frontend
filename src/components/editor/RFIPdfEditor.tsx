"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Code,
  Download,
  Edit3,
  Eye,
  FileText,
  Loader2,
  Lock,
  RefreshCcw,
  Save,
  ShieldAlert,
  Sparkles,
  Square,
  Unlock,
  X,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { toast } from "sonner";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import CharacterCount from "@tiptap/extension-character-count";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";

import { TipTapToolbar } from "./TipTapToolbar";
import { RFIPdfSidebar, type SidebarEntity } from "./RFIPdfSidebar";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { RelativeTime } from "@/components/shared/RelativeTime";
import { UserPill } from "@/components/shared/UserPill";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { pb } from "@/lib/pocketbase";
import { htmlToMarkdown, markdownToHtml } from "@/lib/markdown-converter";
import {
  buildRfiPdfDraftStreamUrl,
  exportRfiPdf,
  getRfiPdf,
  getRfiPdfPreview,
  getRfiPdfTimeline,
  lockRfiPdf,
  regenerateRfiPdfDraft,
  saveRfiPdf,
  stopRfiPdfGeneration,
  unlockRfiPdf,
  type RFIPdfEntityRef,
  type RFIPdfProjectResponse,
  type RFIPdfTimelineEntry,
} from "@/services/rfi-pdf.service";
import {
  buildEntityChip,
  buildEngineerTable,
  buildProjectTable,
} from "./rfi-pdf-snippets";

interface RFIPdfEditorProps {
  documentId: string;
}

const ACTIVE_PIPELINE_STATUSES = new Set([
  "uploading",
  "parsing",
  "extracting",
  "generating",
  "drafting",
]);

function actionLabel(action: string) {
  return action.replace(/^rfi_pdf\./, "").replace(/_/g, " ");
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (
      error as {
        response?: { data?: { error?: { message?: string }; detail?: string } };
      }
    ).response?.data?.detail === "string"
  ) {
    return String(
      (error as { response: { data: { detail: string } } }).response.data.detail
    );
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: { data?: { error?: { message?: string } } } })
      .response?.data?.error?.message === "string"
  ) {
    return String(
      (error as { response: { data: { error: { message: string } } } }).response
        .data.error.message
    );
  }
  return fallback;
}

export function RFIPdfEditor({ documentId }: RFIPdfEditorProps) {
  const { user } = useAuth();
  const [project, setProject] = useState<RFIPdfProjectResponse | null>(null);
  const [timeline, setTimeline] = useState<RFIPdfTimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [markdownSource, setMarkdownSource] = useState("");
  const [showMarkdown, setShowMarkdown] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [isEnteringEdit, setIsEnteringEdit] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [entityRefs, setEntityRefs] = useState<RFIPdfEntityRef[]>([]);

  const projectRef = useRef<RFIPdfProjectResponse | null>(null);
  const editorHydratingRef = useRef(false);
  const hasHydratedRef = useRef(false);
  /** When true, poller/refetch must not overwrite editor with stale server markdown (streaming draft). */
  const streamingHydrateBlockedRef = useRef(false);
  const editorRef = useRef<Editor | null>(null);
  const isDirtyRef = useRef(false);
  const lastMarkdownRef = useRef("");
  const onDropEntityRef = useRef<((entity: SidebarEntity) => void) | null>(
    null
  );
  const wsRef = useRef<WebSocket | null>(null);
  const regenAbortRef = useRef<AbortController | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }),
      TaskList.configure({
        HTMLAttributes: { class: "not-prose-tasklist" },
      }),
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder:
          "AI-generated draft will appear here. Drag projects or engineers from the right panel to insert them.",
      }),
      Typography,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline underline-offset-2",
        },
      }),
      CharacterCount.configure({ limit: 200_000 }),
      Table.configure({
        resizable: true,
        HTMLAttributes: { class: "rfi-pdf-table" },
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    editable: false,
    editorProps: {
      attributes: {
        class:
          "outline-none min-h-[480px] px-1 prose prose-neutral max-w-none dark:prose-invert prose-headings:font-semibold prose-headings:tracking-tight prose-p:leading-relaxed prose-table:w-full",
      },
      handleDrop(_view, event) {
        const data = event.dataTransfer?.getData("application/x-rfi-entity");
        if (!data) return false;
        try {
          const parsed = JSON.parse(data) as SidebarEntity;
          const handler = onDropEntityRef.current;
          if (handler) {
            handler(parsed);
          }
          event.preventDefault();
          return true;
        } catch (err) {
          console.error("Failed to read drag payload", err);
          return false;
        }
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (editorHydratingRef.current) return;
      isDirtyRef.current = true;
      setIsDirty(true);
      const html = ed.getHTML();
      lastMarkdownRef.current = htmlToMarkdown(html);
      setMarkdownSource(lastMarkdownRef.current);
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  const refresh = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const [nextProject, nextTimeline] = await Promise.all([
          getRfiPdf(documentId),
          getRfiPdfTimeline(documentId),
        ]);
        projectRef.current = nextProject;
        setProject(nextProject);
        setTimeline(nextTimeline);
        setEntityRefs(nextProject.entity_refs || []);
        if (nextProject.status === "ready" || nextProject.status === "failed") {
          streamingHydrateBlockedRef.current = false;
        }
        const allowHydrate =
          Boolean(editor) &&
          (!isDirtyRef.current || !hasHydratedRef.current) &&
          !streamingHydrateBlockedRef.current;
        if (allowHydrate && editor) {
          editorHydratingRef.current = true;
          const html =
            nextProject.editor_html ||
            markdownToHtml(nextProject.editor_markdown || "");
          editor.commands.setContent(html, { emitUpdate: false });
          editorHydratingRef.current = false;
          const wasHydrated = hasHydratedRef.current;
          hasHydratedRef.current = true;
          if (!wasHydrated) {
            isDirtyRef.current = false;
            setIsDirty(false);
          }
          lastMarkdownRef.current = nextProject.editor_markdown || "";
          setMarkdownSource(nextProject.editor_markdown || "");
        }
      } catch (err: unknown) {
        toast.error(getErrorMessage(err, "Failed to load RFI PDF"));
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [documentId, editor]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!editor) return;
    const lockedByOther = !!projectRef.current?.is_locked_by_other;
    editor.setEditable(isEditing && !lockedByOther);
  }, [editor, isEditing, project?.is_locked_by_other]);

  useEffect(() => {
    if (!project) return;
    if (!ACTIVE_PIPELINE_STATUSES.has(project.status)) return;
    const interval = window.setInterval(() => {
      refresh(true).catch(() => {});
    }, 5000);
    return () => window.clearInterval(interval);
  }, [project?.status, project, refresh]);

  useEffect(() => {
    if (!project?.status || !ACTIVE_PIPELINE_STATUSES.has(project.status)) {
      return;
    }
    streamingHydrateBlockedRef.current = true;
    let acc = "";
    const token = pb.authStore.token || "";
    let cleanupClose = false;
    let wsTerminal = false;
    let rafId: number | null = null;
    let rafPending = false;
    const ws = new WebSocket(buildRfiPdfDraftStreamUrl(documentId, token));
    wsRef.current = ws;

    /** Flush accumulated markdown into the editor — called at most once per frame. */
    const flushToEditor = () => {
      rafPending = false;
      rafId = null;
      const ed = editorRef.current;
      if (ed) {
        editorHydratingRef.current = true;
        ed.commands.setContent(markdownToHtml(acc), {
          emitUpdate: false,
        });
        editorHydratingRef.current = false;
      }
      setMarkdownSource(acc);
    };

    /** Schedule a single editor update on the next animation frame. */
    const scheduleFlush = () => {
      if (!rafPending) {
        rafPending = true;
        rafId = requestAnimationFrame(flushToEditor);
      }
    };

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data as string) as {
          type?: string;
          delta?: string;
          message?: string;
        };

        switch (data.type) {
          case "connected":
          case "phase":
            break;
          case "draft_delta":
            if (typeof data.delta !== "string") break;
            acc += data.delta;
            streamingHydrateBlockedRef.current = true;
            scheduleFlush();
            break;
          case "draft_complete":
          case "already_complete":
            wsTerminal = true;
            streamingHydrateBlockedRef.current = false;
            // Flush any remaining buffered content immediately
            if (rafPending && rafId != null) {
              cancelAnimationFrame(rafId);
              flushToEditor();
            }
            void refresh(true);
            break;
          case "draft_error":
          case "already_failed":
            wsTerminal = true;
            streamingHydrateBlockedRef.current = false;
            if (rafPending && rafId != null) {
              cancelAnimationFrame(rafId);
              flushToEditor();
            }
            toast.error(
              typeof data.message === "string"
                ? data.message
                : "Draft generation failed"
            );
            void refresh(true);
            break;
          default:
            break;
        }
      } catch {
        // ignore malformed socket payloads
      }
    };

    ws.onclose = () => {
      streamingHydrateBlockedRef.current = false;
      wsRef.current = null;
      if (rafPending && rafId != null) {
        cancelAnimationFrame(rafId);
        flushToEditor();
      }
      const st = projectRef.current?.status;
      if (
        !cleanupClose &&
        !wsTerminal &&
        typeof st === "string" &&
        ACTIVE_PIPELINE_STATUSES.has(st)
      ) {
        void refresh(true);
      }
    };

    return () => {
      cleanupClose = true;
      streamingHydrateBlockedRef.current = false;
      if (rafId != null) cancelAnimationFrame(rafId);
      ws.close();
      wsRef.current = null;
    };
  }, [documentId, project?.status, refresh]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      regenAbortRef.current?.abort();
      wsRef.current?.close();
    };
  }, [previewUrl]);

  const ensureLock = useCallback(async (): Promise<RFIPdfProjectResponse> => {
    if (!projectRef.current) throw new Error("RFI PDF is not loaded yet");
    if (projectRef.current.is_lock_held_by_me) return projectRef.current;
    const locked = await lockRfiPdf(documentId);
    projectRef.current = locked;
    setProject(locked);
    setEntityRefs(locked.entity_refs || []);
    setIsEditing(true);
    return locked;
  }, [documentId]);

  const handleBeginEdit = useCallback(async () => {
    setIsEnteringEdit(true);
    try {
      await ensureLock();
      toast.success("Edit lock acquired");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Could not acquire edit lock"));
    } finally {
      setIsEnteringEdit(false);
    }
  }, [ensureLock]);

  const handleCancelEdit = useCallback(async () => {
    setIsCancelling(true);
    const savedMarkdown = lastMarkdownRef.current;
    if (editor) {
      editorHydratingRef.current = true;
      const html =
        projectRef.current?.editor_html ||
        markdownToHtml(projectRef.current?.editor_markdown || "");
      editor.commands.setContent(html, { emitUpdate: false });
      editorHydratingRef.current = false;
    }
    isDirtyRef.current = false;
    setIsDirty(false);
    try {
      const released = await unlockRfiPdf(documentId);
      projectRef.current = released;
      setProject(released);
      setEntityRefs(released.entity_refs || []);
      if (editor) {
        editorHydratingRef.current = true;
        const html =
          released.editor_html ||
          markdownToHtml(released.editor_markdown || "");
        editor.commands.setContent(html, { emitUpdate: false });
        editorHydratingRef.current = false;
        lastMarkdownRef.current = released.editor_markdown || "";
        setMarkdownSource(released.editor_markdown || "");
      }
      setIsEditing(false);
      toast.success("Edit cancelled");
    } catch (err: unknown) {
      if (editor) {
        editorHydratingRef.current = true;
        editor.commands.setContent(markdownToHtml(savedMarkdown), {
          emitUpdate: false,
        });
        editorHydratingRef.current = false;
      }
      toast.error(getErrorMessage(err, "Could not release the edit lock"));
    } finally {
      setIsCancelling(false);
    }
  }, [documentId, editor]);

  const handleForceUnlock = useCallback(async () => {
    try {
      const released = await unlockRfiPdf(documentId);
      projectRef.current = released;
      setProject(released);
      toast.success("Lock released");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Could not release the lock"));
    }
  }, [documentId]);

  const handleSave = useCallback(async () => {
    if (!editor || !projectRef.current) return;
    setSaving(true);
    try {
      const html = editor.getHTML();
      const markdown = htmlToMarkdown(html);
      const saved = await saveRfiPdf(documentId, {
        editor_markdown: markdown,
        editor_html: html,
        entity_refs: entityRefs,
      });
      projectRef.current = saved;
      setProject(saved);
      setEntityRefs(saved.entity_refs || []);
      lastMarkdownRef.current = saved.editor_markdown || markdown;
      setMarkdownSource(saved.editor_markdown || markdown);
      isDirtyRef.current = false;
      setIsDirty(false);
      setIsEditing(false);
      toast.success("Draft saved");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Could not save the draft"));
    } finally {
      setSaving(false);
    }
  }, [documentId, editor, entityRefs]);

  const handleRegenerate = useCallback(async () => {
    if (!project) return;
    regenAbortRef.current?.abort();
    const controller = new AbortController();
    regenAbortRef.current = controller;
    setRegenerating(true);
    try {
      const updated = await regenerateRfiPdfDraft(documentId, {});
      projectRef.current = updated;
      setProject(updated);
      toast.success("Regeneration started. The draft will refresh shortly.");
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        // cancelled by user — do not show error
      } else {
        toast.error(getErrorMessage(err, "Could not start regeneration"));
      }
    } finally {
      setRegenerating(false);
      regenAbortRef.current = null;
    }
  }, [documentId, project]);

  const handleStopGeneration = useCallback(async () => {
    // Signal the backend to cancel the LLM stream
    try {
      const updated = await stopRfiPdfGeneration(documentId);
      projectRef.current = updated;
      setProject(updated);
    } catch {
      // Even if the backend call fails, still clean up client-side
    }
    wsRef.current?.close();
    wsRef.current = null;
    regenAbortRef.current?.abort();
    regenAbortRef.current = null;
    setRegenerating(false);
    streamingHydrateBlockedRef.current = false;
    toast.info("Generation stopped. Partial content kept.", { duration: 3000 });
  }, [documentId]);

  const refreshPreview = useCallback(async () => {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      // Persist the latest markdown so the preview matches what is on disk.
      if (
        editor &&
        projectRef.current?.is_lock_held_by_me &&
        isDirtyRef.current
      ) {
        await handleSave();
      }
      const blob = await getRfiPdfPreview(documentId);
      const url = URL.createObjectURL(blob);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } catch (err: unknown) {
      setPreviewError(getErrorMessage(err, "Preview is not available yet"));
    } finally {
      setPreviewLoading(false);
    }
  }, [documentId, editor, handleSave]);

  const handleOpenPreview = useCallback(async () => {
    setShowPreview(true);
    await refreshPreview();
  }, [refreshPreview]);

  const handleExport = useCallback(async () => {
    if (!project) return;
    try {
      if (projectRef.current?.is_lock_held_by_me && isDirtyRef.current) {
        await handleSave();
      }
      await exportRfiPdf(
        documentId,
        `${project.slug || `rfi-${project.id}`}_response.pdf`
      );
      toast.success("PDF exported");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Export failed"));
    }
  }, [documentId, project, handleSave]);

  const insertEntityRef = useCallback(
    (entity: SidebarEntity, opts: { fromDrop?: boolean } = {}) => {
      if (!editor) return;
      if (!isEditing) {
        toast.info("Switch to edit mode before inserting data.");
        return;
      }
      if (!editor.isEditable) {
        toast.error("Editor is locked.");
        return;
      }
      const html =
        entity.type === "project"
          ? buildProjectTable(entity.data)
          : buildEngineerTable(entity.data);
      const chip = buildEntityChip(entity);
      const insertion = `${chip}${html}`;
      const previousLength = editor.getHTML().length;
      editor
        .chain()
        .focus()
        .insertContent(insertion, {
          parseOptions: { preserveWhitespace: true },
        })
        .run();
      const ref: RFIPdfEntityRef = {
        type: entity.type,
        refId: entity.type === "project" ? entity.data.id : entity.data.id,
        label:
          entity.type === "project"
            ? entity.data.name
            : entity.data.name || entity.data.email,
        payload: entity.data as unknown as Record<string, unknown>,
        insertedAt: new Date().toISOString(),
      };
      setEntityRefs((prev) => [...prev, ref]);
      isDirtyRef.current = true;
      setIsDirty(true);
      if (!opts.fromDrop && previousLength === editor.getHTML().length) {
        toast.error("Insertion failed");
      }
    },
    [editor, isEditing]
  );

  const handleSidebarInsert = useCallback(
    (entity: SidebarEntity) => insertEntityRef(entity),
    [insertEntityRef]
  );

  useEffect(() => {
    onDropEntityRef.current = (entity: SidebarEntity) =>
      insertEntityRef(entity, { fromDrop: true });
  }, [insertEntityRef]);

  const handleMarkdownSourceChange = (value: string) => {
    setMarkdownSource(value);
    if (!editor) return;
    if (!editor.isEditable) return;
    editorHydratingRef.current = true;
    editor.commands.setContent(markdownToHtml(value), { emitUpdate: false });
    editorHydratingRef.current = false;
    lastMarkdownRef.current = value;
    isDirtyRef.current = true;
    setIsDirty(true);
  };

  const isBusy = saving || regenerating;
  const isPipelineActive =
    !!project && ACTIVE_PIPELINE_STATUSES.has(project.status);
  const pipelineStatus = useMemo(
    () => (project ? project.status : "loading"),
    [project]
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Loading RFI PDF…
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        RFI PDF not found.
      </div>
    );
  }

  const lockMessage = project.is_locked_by_other
    ? `${
        project.editing_user?.name ||
        project.editing_user?.email ||
        "Another user"
      } is editing this RFI.`
    : null;

  return (
    <div
      className={cn(
        "flex h-full min-h-0 gap-3",
        showSidebar ? "gap-3" : "gap-0"
      )}
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Card className="flex min-h-0 flex-1 flex-col rounded-none border-x-0 border-t-0 border-border/70 shadow-none">
          <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 border-b px-5 py-2">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-4 text-muted-foreground" />
                <span className="truncate" title={project.fileName}>
                  {project.title || project.fileName || "RFI Response"}
                </span>
                <StatusBadge status={pipelineStatus} />
              </CardTitle>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                Source:{" "}
                <span className="font-medium text-foreground">
                  {project.fileName}
                </span>
                {project.updated_at && (
                  <>
                    {" · "}Updated{" "}
                    <RelativeTime iso={project.updated_at} className="inline" />
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowMarkdown((v) => !v)}
                      aria-pressed={showMarkdown}
                    >
                      <Code className="size-4" />
                      {showMarkdown ? "Hide source" : "Markdown source"}
                    </Button>
                  }
                />
                <TooltipContent>Toggle markdown source panel</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSidebar((v) => !v)}
                      aria-pressed={showSidebar}
                    >
                      {showSidebar ? (
                        <PanelRightClose className="size-4" />
                      ) : (
                        <PanelRightOpen className="size-4" />
                      )}
                      {showSidebar ? "Hide insert data" : "Insert data"}
                    </Button>
                  }
                />
                <TooltipContent>Toggle insert data panel</TooltipContent>
              </Tooltip>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenPreview}
                disabled={!project.editor_markdown && !project.editor_html}
              >
                <Eye className="size-4" />
                Preview PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={
                  isBusy || (!project.editor_markdown && !project.editor_html)
                }
              >
                <Download className="size-4" />
                Export PDF
              </Button>
              {isPipelineActive || regenerating ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleStopGeneration}
                  className="gap-1.5"
                >
                  <Square className="size-3.5 fill-current" />
                  Stop
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerate}
                  disabled={!project.parsed_markdown}
                >
                  <RefreshCcw className="size-4" />
                  Regenerate
                </Button>
              )}
              {!isEditing ? (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleBeginEdit}
                  disabled={
                    isEnteringEdit ||
                    Boolean(project.is_locked_by_other) ||
                    isPipelineActive ||
                    isBusy
                  }
                >
                  {isEnteringEdit ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Edit3 className="size-4" />
                  )}
                  {isEnteringEdit ? "Entering edit…" : "Edit"}
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
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
                    variant="default"
                    size="sm"
                    onClick={handleSave}
                    disabled={isBusy || !isDirty}
                  >
                    {saving ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    Save Changes
                  </Button>
                </>
              )}
              {project.is_locked_by_other && user?.is_admin && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleForceUnlock}
                >
                  <ShieldAlert className="size-4" />
                  Force Unlock
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTimeline(true)}
                title="Activity timeline"
              >
                <Sparkles className="size-4" />
                Timeline
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
            {lockMessage && (
              <Banner
                icon={<Lock className="size-4" />}
                title="Editing locked"
                message={lockMessage}
              />
            )}
            {isEditing && !project.is_locked_by_other && (
              <Banner
                icon={<Unlock className="size-4" />}
                title="You are editing this RFI"
                message="Other users cannot edit it until you Save or Cancel."
              />
            )}
            {isPipelineActive && (
              <Banner
                icon={<Loader2 className="size-4 animate-spin" />}
                title="AI is working"
                message={`The pipeline is currently ${actionLabel(
                  project.status
                )}. The editor will update automatically.`}
              />
            )}
            {project.status === "failed" && (
              <Banner
                icon={<AlertTriangle className="size-4 text-destructive" />}
                title="Pipeline failed"
                message={
                  project.error_message ||
                  "Generation failed. You can still edit the document manually."
                }
                variant="error"
              />
            )}
            {typeof project.metadata?.warning === "string" &&
            project.metadata.warning ? (
              <Banner
                icon={<AlertTriangle className="size-4" />}
                title="Extraction warning"
                message={String(project.metadata.warning)}
              />
            ) : null}
            {isEditing && (
              <div className="border-b bg-muted/30 px-4 py-1">
                <TipTapToolbar editor={editor} />
              </div>
            )}
            <div className="flex min-h-0 flex-1 overflow-hidden">
              <div
                className={cn(
                  "flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-4",
                  showMarkdown ? "border-r" : ""
                )}
              >
                {isEnteringEdit ? (
                  <div className="animate-pulse space-y-4 px-12 py-8">
                    <div className="h-6 w-3/4 rounded bg-muted" />
                    <div className="h-4 w-full rounded bg-muted" />
                    <div className="h-4 w-5/6 rounded bg-muted" />
                    <div className="h-4 w-full rounded bg-muted" />
                    <div className="h-4 w-2/3 rounded bg-muted" />
                  </div>
                ) : isCancelling ? (
                  <div className="flex items-center gap-2 px-12 py-8 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Reverting changes…
                  </div>
                ) : (
                  <EditorContent editor={editor} />
                )}
              </div>
              {showMarkdown && (
                <div className="flex min-h-0 w-[420px] flex-col bg-muted/20">
                  <div className="border-b px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Markdown source
                  </div>
                  <Textarea
                    value={markdownSource}
                    onChange={(e) => handleMarkdownSourceChange(e.target.value)}
                    disabled={!isEditing || Boolean(project.is_locked_by_other)}
                    className="h-full w-full resize-none rounded-none border-0 bg-transparent font-mono text-xs leading-relaxed focus-visible:ring-0"
                  />
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 border-t px-4 py-1.5 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-3">
                {editor && (
                  <>
                    <span>
                      {editor.storage.characterCount.characters()} chars
                    </span>
                    <span>{editor.storage.characterCount.words()} words</span>
                  </>
                )}
                {entityRefs.length > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {entityRefs.length} inserted
                  </Badge>
                )}
              </div>
              {isDirty && (
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <span className="size-1.5 rounded-full bg-amber-600 dark:bg-amber-400" />
                  <span>Unsaved changes</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {showSidebar && (
        <div className="flex w-[320px] shrink-0 min-h-0 flex-col">
          <RFIPdfSidebar
            onInsert={handleSidebarInsert}
            disabled={!isEditing || Boolean(project.is_locked_by_other)}
          />
        </div>
      )}

      <PdfPreviewModal
        open={showPreview}
        onOpenChange={setShowPreview}
        fileName={project.fileName}
        previewUrl={previewUrl}
        previewError={previewError}
        previewLoading={previewLoading}
        onRefresh={refreshPreview}
      />

      <Sheet open={showTimeline} onOpenChange={setShowTimeline}>
        <SheetContent side="right" className="w-[92vw] sm:max-w-3xl p-0">
          <SheetHeader className="border-b">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-muted-foreground" />
              RFI PDF Timeline
            </SheetTitle>
            <p className="text-xs text-muted-foreground">Most recent first</p>
          </SheetHeader>
          <div className="h-[calc(100vh-6rem)] overflow-y-auto p-4">
            {timeline.length === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No activity yet.
              </p>
            ) : (
              <div className="space-y-3">
                {timeline.map((entry) => (
                  <div key={entry.id} className="relative pl-6">
                    <span className="absolute left-1 top-3 h-full w-px bg-border" />
                    <span className="absolute left-0 top-2 size-3 rounded-full bg-muted-foreground/60 ring-4 ring-background" />
                    <div className="rounded-lg border bg-card p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <StatusBadge status={actionLabel(entry.action)} />
                          <p className="mt-2 text-sm font-medium">
                            {entry.details &&
                            typeof entry.details === "object" &&
                            "filename" in entry.details
                              ? String(
                                  (entry.details as Record<string, unknown>)
                                    .filename || actionLabel(entry.action)
                                )
                              : actionLabel(entry.action)}
                          </p>
                          {entry.details &&
                            typeof entry.details === "object" && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {Object.entries(entry.details).map(
                                  ([key, value]) => {
                                    if (key === "filename") return null;
                                    let formattedKey = key;
                                    let formattedValue = String(value);
                                    if (key === "markdown_length") {
                                      formattedKey = "Content Length";
                                      formattedValue = `${value} chars`;
                                    } else if (key === "entity_refs") {
                                      formattedKey = "Data Inserted";
                                      formattedValue = `${value} items`;
                                    } else if (key === "requirements_count") {
                                      formattedKey = "Extracted Requirements";
                                    } else if (key === "previous_editor") {
                                      formattedKey = "Previous Editor";
                                      formattedValue =
                                        typeof value === "object" && value
                                          ? (value as Record<string, string>).name ||
                                            (value as Record<string, string>).email
                                          : String(value);
                                    }
                                    return (
                                      <Badge
                                        key={key}
                                        variant="outline"
                                        className="text-[10px] font-normal bg-muted/30"
                                      >
                                        <span className="text-muted-foreground mr-1">
                                          {formattedKey}:
                                        </span>
                                        {formattedValue}
                                      </Badge>
                                    );
                                  }
                                )}
                              </div>
                            )}
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
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

interface PdfPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName?: string | null;
  previewUrl: string | null;
  previewError: string | null;
  previewLoading: boolean;
  onRefresh: () => void | Promise<void>;
}

function PdfPreviewModal({
  open,
  onOpenChange,
  fileName,
  previewUrl,
  previewError,
  previewLoading,
  onRefresh,
}: PdfPreviewModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-preview-title"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close preview"
        onClick={() => onOpenChange(false)}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-200"
      />

      {/* Modal container */}
      <div
        className="relative z-10 flex h-[90vh] w-[90vw] max-w-6xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b px-5 py-3">
          <div className="min-w-0">
            <h2
              id="pdf-preview-title"
              className="flex items-center gap-2 text-base font-semibold"
            >
              <Eye className="size-4" />
              PDF Preview
              {fileName && (
                <Badge variant="secondary" className="truncate">
                  {fileName}
                </Badge>
              )}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Live render of the current draft. Save changes to refresh.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void onRefresh()}
              disabled={previewLoading}
            >
              {previewLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCcw className="size-4" />
              )}
              Refresh
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              aria-label="Close preview"
              className="size-8 p-0"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-muted/30 p-4">
          {previewError ? (
            <div className="flex h-full items-center justify-center text-sm text-destructive">
              {previewError}
            </div>
          ) : previewUrl ? (
            <iframe
              src={previewUrl}
              title="RFI PDF preview"
              className="h-full w-full flex-1 rounded-md border bg-background"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" /> Rendering
              preview…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Banner({
  icon,
  title,
  message,
  variant,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  variant?: "error" | "info";
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 border-b px-4 py-2 text-sm",
        variant === "error"
          ? "bg-destructive/10 text-destructive"
          : "bg-muted/30 text-muted-foreground"
      )}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>
        <div
          className={cn(
            "font-semibold",
            variant === "error" ? "text-destructive" : "text-foreground"
          )}
        >
          {title}
        </div>
        <p className="mt-0.5">{message}</p>
      </div>
    </div>
  );
}
