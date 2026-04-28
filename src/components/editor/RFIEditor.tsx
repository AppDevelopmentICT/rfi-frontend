"use client";

import { useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { toast } from "sonner";
import { useRFIStore } from "@/store/useRFIStore";
import { EditorHeader } from "@/components/editor/EditorHeader";
import { QuestionCard } from "@/components/editor/QuestionCard";
import {
  useGenerateAllMutation,
  useRegenerateMutation,
} from "@/hooks/useAIQueries";

interface RFIEditorProps {
  rfiId: string;
}

export function RFIEditor({ rfiId }: RFIEditorProps) {
  const questions = useRFIStore((s) => s.questions);
  const isGeneratingAll = useRFIStore((s) => s.isGeneratingAll);
  const updateAnswer = useRFIStore((s) => s.updateAnswer);
  const updateSources = useRFIStore((s) => s.updateSources);
  const setQuestionStatus = useRFIStore((s) => s.setQuestionStatus);
  const setGeneratingAll = useRFIStore((s) => s.setGeneratingAll);
  const bulkUpdateAnswers = useRFIStore((s) => s.bulkUpdateAnswers);

  const parentRef = useRef<HTMLDivElement>(null);

  const generateAllMutation = useGenerateAllMutation();
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

  const handleGenerateAll = useCallback(() => {
    setGeneratingAll(true);

    const targetIds = questions
      .filter((q) => q.status === "idle")
      .map((q) => q.id);

    targetIds.forEach((id) => setQuestionStatus(id, "generating"));

    generateAllMutation.mutate(
      { documentId: rfiId, questions },
      {
        onSuccess: (data) => {
          const resultIds = new Set(data.results.map((r) => r.id));
          bulkUpdateAnswers(data.results);

          // Revert questions that didn't receive a result
          const failedIds = targetIds.filter((id) => !resultIds.has(id));
          failedIds.forEach((id) => setQuestionStatus(id, "idle"));

          setGeneratingAll(false);

          if (failedIds.length === 0) {
            toast.success(
              `All ${data.results.length} answers generated successfully`
            );
          } else {
            toast.warning(
              `${data.results.length} answers generated. ${failedIds.length} failed — please retry them individually.`
            );
          }
        },
        onError: () => {
          targetIds.forEach((id) => setQuestionStatus(id, "idle"));
          setGeneratingAll(false);
        },
      }
    );
  }, [
    rfiId,
    questions,
    setGeneratingAll,
    setQuestionStatus,
    bulkUpdateAnswers,
    generateAllMutation,
  ]);

  const handleSave = useCallback(() => {
    toast.success("This feature is not available yet.");
  }, []);

  const handleExport = useCallback(() => {
    toast.info("Export functionality coming soon");
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-muted/40" style={{ height: "calc(100dvh - 3.5rem)" }}>
      <EditorHeader
        title={`RFI Project - ${rfiId}.xlsx`}
        questionCount={questions.length}
        isGeneratingAll={isGeneratingAll}
        onGenerateAll={handleGenerateAll}
        onSave={handleSave}
        onExport={handleExport}
      />

      <div ref={parentRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-6 py-6">
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
        </div>
      </div>
    </div>
  );
}
