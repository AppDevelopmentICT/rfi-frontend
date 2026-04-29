"use client";

import { useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { toast } from "sonner";
import { useRFIStore } from "@/store/useRFIStore";
import { EditorHeader } from "@/components/editor/EditorHeader";
import { QuestionCard } from "@/components/editor/QuestionCard";
import { useAutoFillMutation } from "@/hooks/useRFIQueries";
import { useRegenerateMutation } from "@/hooks/useAIQueries";

interface RFIEditorProps {
  rfiId: string;
}

export function RFIEditor({ rfiId }: RFIEditorProps) {
  const questions = useRFIStore((s) => s.questions);
  const file = useRFIStore((s) => s.file);
  const fileName = useRFIStore((s) => s.fileName);
  const updateAnswer = useRFIStore((s) => s.updateAnswer);
  const updateSources = useRFIStore((s) => s.updateSources);
  const setQuestionStatus = useRFIStore((s) => s.setQuestionStatus);

  const parentRef = useRef<HTMLDivElement>(null);

  const { mutate, isPending, data: autoFillResult } = useAutoFillMutation();
  const regenerateMutation = useRegenerateMutation();

  const virtualizer = useVirtualizer({
    count: questions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 280,
    overscan: 5,
  });

  const handleAnswerChange = useCallback(
    (id: string, answer: string) => {
      updateAnswer(id, answer);
    },
    [updateAnswer]
  );

  const handleRegenerate = useCallback(
    (id: string) => {
      setQuestionStatus(id, "generating");
      regenerateMutation.mutate(
        { documentId: rfiId, questionId: id },
        {
          onSuccess: (data) => {
            updateAnswer(id, data.answer);
            updateSources(id, data.sources);
            setQuestionStatus(id, "completed");
            toast.success("Answer regenerated");
          },
          onError: () => {
            setQuestionStatus(id, "idle");
          },
        }
      );
    },
    [rfiId, setQuestionStatus, updateAnswer, updateSources, regenerateMutation]
  );

  const handleAutoFillExcel = useCallback(() => {
    if (!file) {
      toast.error(
        "Original workbook is unavailable. Go back to upload and open the file again."
      );
      return;
    }

    mutate({
      file,
      originalFileName: fileName || file.name,
      options: undefined,
    });
  }, [file, fileName, mutate]);

  const handleSave = useCallback(() => {
    toast.success("This feature is not available yet.");
  }, []);

  const handleExport = useCallback(() => {
    handleAutoFillExcel();
  }, [handleAutoFillExcel]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-muted/40" style={{ height: "calc(100dvh - 3.5rem)" }}>
      <EditorHeader
        title={fileName ? `RFI Project - ${fileName}` : `RFI Project - ${rfiId}.xlsx`}
        questionCount={questions.length}
        isGeneratingAll={isPending}
        generateAllLabel="Auto-fill Excel"
        generatingLabel="Filling workbook..."
        onGenerateAll={handleAutoFillExcel}
        onSave={handleSave}
        onExport={handleExport}
      />

      <div ref={parentRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-6 py-6">
          {questions.length === 0 ? (
            <div className="rounded-lg border bg-background p-6 shadow-sm">
              <h2 className="text-base font-semibold">Ready to generate Excel response</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                The selected workbook will be uploaded only when you click Auto-fill Excel.
                The backend response is the filled .xlsx file, which will download automatically.
              </p>

              {fileName && (
                <p className="mt-4 rounded-md bg-muted px-3 py-2 text-sm">
                  Selected file: <span className="font-medium">{fileName}</span>
                </p>
              )}

              {autoFillResult && (
                <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
                  <p className="font-medium">Excel response generated</p>
                  <p className="mt-1">
                    {autoFillResult.message || "Filled workbook downloaded."}
                  </p>
                  <p className="mt-1 text-xs">File: {autoFillResult.filename}</p>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                height: virtualizer.getTotalSize(),
                position: "relative",
              }}
            >
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const question = questions[virtualItem.index];
                return (
                  <div
                    key={virtualItem.key}
                    data-index={virtualItem.index}
                    ref={virtualizer.measureElement}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <div className="pb-4">
                      <QuestionCard
                        question={question}
                        onAnswerChange={handleAnswerChange}
                        onRegenerate={handleRegenerate}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
