"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles,
  Loader2,
  Save,
  Download,
  RotateCcw,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { useRFPStore } from "@/store/useRFPStore";
import { useRFPStream } from "@/hooks/useRFPStream";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

interface RFPTechnicalEditorProps {
  rfpId: string;
}

export function RFPTechnicalEditor({ rfpId }: RFPTechnicalEditorProps) {
  const product = useRFPStore((s) => s.product);
  const projectName = useRFPStore((s) => s.projectName);
  const projectDescription = useRFPStore((s) => s.projectDescription);
  const technicalContent = useRFPStore((s) => s.technicalContent);
  const streamingContent = useRFPStore((s) => s.streamingContent);
  const phase = useRFPStore((s) => s.phase);
  const appendChunk = useRFPStore((s) => s.appendChunk);
  const setTechnicalContent = useRFPStore((s) => s.setTechnicalContent);
  const setPhase = useRFPStore((s) => s.setPhase);
  const setErrorMessage = useRFPStore((s) => s.setErrorMessage);

  const [adjustContext, setAdjustContext] = useState("");
  const [editedContent, setEditedContent] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const prevStreamRef = useRef(streamingContent);

  const stream = useRFPStream({
    onChunk: (chunk) => {
      appendChunk(chunk);
    },
    onComplete: (full) => {
      setTechnicalContent(full);
      setEditedContent(null);
      setPhase("completed");
      toast.success("Generation complete");
    },
    onError: (msg) => {
      setPhase("error");
      setErrorMessage(msg);
    },
  });

  const isStreaming = stream.isStreaming;
  const phaseLabel =
    phase === "generating"
      ? "Generating..."
      : phase === "adjusting"
        ? "Adjusting..."
        : null;

  const displayContent = useMemo(() => {
    if (isStreaming) return streamingContent;
    if (editedContent !== null) return editedContent;
    return technicalContent;
  }, [isStreaming, streamingContent, editedContent, technicalContent]);

  useEffect(() => {
    if (isStreaming && prevStreamRef.current !== streamingContent) {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
    prevStreamRef.current = streamingContent;
  }, [streamingContent, isStreaming]);

  const handleLocalChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setEditedContent(val);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setTechnicalContent(val);
      }, 500);
    },
    [setTechnicalContent]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleGenerate = useCallback(() => {
    if (!product.trim()) {
      toast.error("Product name required");
      return;
    }
    setPhase("generating");
    stream.generate(product, { projectName, projectDescription });
  }, [product, projectName, projectDescription, stream, setPhase]);

  const handleAdjust = useCallback(() => {
    if (!adjustContext.trim()) {
      toast.error("Enter adjustment instructions");
      return;
    }
    if (!technicalContent.trim()) {
      toast.error("No content to adjust. Generate first.");
      return;
    }
    setPhase("adjusting");
    stream.adjust(product, technicalContent, adjustContext);
    setAdjustContext("");
  }, [adjustContext, technicalContent, product, stream, setPhase]);

  const handleSave = useCallback(() => {
    toast.success("Changes saved successfully");
  }, []);

  const handleExport = useCallback(() => {
    if (!displayContent.trim()) {
      toast.error("No content to export");
      return;
    }
    const blob = new Blob([displayContent], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `RFP_Chapter3_Technical_${rfpId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported successfully");
  }, [displayContent, rfpId]);

  const hasContent = technicalContent.trim().length > 0;
  const isEdited =
    hasContent && editedContent !== null && editedContent !== technicalContent;

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur-sm px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold tracking-tight">
              RFP Technical Proposal — {product || rfpId}
            </h1>
            {isStreaming && phaseLabel && (
              <Badge variant="secondary" className="gap-1">
                <Loader2 className="size-3 animate-spin" />
                {phaseLabel}
              </Badge>
            )}
            {phase === "completed" && !isStreaming && (
              <Badge variant="secondary">Complete</Badge>
            )}
            {phase === "error" && (
              <Badge variant="destructive">Error</Badge>
            )}
            {isEdited && <Badge variant="outline">Edited</Badge>}
          </div>
          <div className="flex items-center gap-2">
            {!hasContent && (
              <Button
                variant="default"
                size="sm"
                onClick={handleGenerate}
                disabled={isStreaming}
              >
                {isStreaming ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Sparkles />
                )}
                Generate Chapter 3
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleSave}>
              <Save />
              Save
            </Button>
            <Button variant="ghost" size="sm" onClick={handleExport}>
              <Download />
              Export
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto" ref={scrollRef}>
        <div className="mx-auto max-w-4xl px-6 py-6">
          {isStreaming ? (
            <div className="min-h-[400px] rounded-xl border bg-card p-6">
              <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                <span>
                  {phase === "generating"
                    ? "Generating technical proposal..."
                    : "Adjusting content..."}
                </span>
              </div>
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {streamingContent}
                <span className="inline-block h-4 w-0.5 animate-pulse bg-foreground" />
              </div>
            </div>
          ) : hasContent ? (
            <div className="rounded-xl border bg-card p-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-muted-foreground">
                  Chapter 3 — Technical Content
                </h2>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={handleGenerate}
                  disabled={isStreaming}
                >
                  <RotateCcw className="size-3" />
                  Regenerate
                </Button>
              </div>
              <Textarea
                value={displayContent}
                onChange={handleLocalChange}
                className="min-h-[500px] resize-y text-sm leading-relaxed"
                placeholder="Technical content will appear here..."
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-24 text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
                <Sparkles className="size-7 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">
                Generate Technical Proposal
              </h3>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Click &quot;Generate Chapter 3&quot; to start generating the
                technical content for your RFP proposal. You can adjust and
                refine the result afterwards.
              </p>
              <Button
                variant="default"
                size="lg"
                className="mt-6"
                onClick={handleGenerate}
                disabled={isStreaming}
              >
                <Sparkles />
                Generate Chapter 3
              </Button>
            </div>
          )}

          {hasContent && !isStreaming && (
            <div className="mt-4 rounded-xl border bg-card p-4">
              <h3 className="mb-2 text-sm font-semibold">Adjust Content</h3>
              <p className="mb-3 text-xs text-muted-foreground">
                Describe how you want to refine the generated content. The AI
                will rewrite the chapter based on your instructions.
              </p>
              <div className="flex gap-2">
                <Textarea
                  value={adjustContext}
                  onChange={(e) => setAdjustContext(e.target.value)}
                  placeholder="e.g. Make the security section more detailed, add cloud deployment architecture..."
                  className="min-h-[60px] flex-1 resize-none text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleAdjust();
                    }
                  }}
                />
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleAdjust}
                  disabled={isStreaming}
                  className="shrink-0 self-end"
                >
                  <Send />
                  Adjust
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
