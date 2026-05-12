"use client";

import { useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { toast } from "sonner";
import { useRFPStore } from "@/store/useRFPStore";
import { EditorHeader } from "@/components/editor/EditorHeader";
import { QuestionCard } from "@/components/editor/QuestionCard";
import {
  useGenerateAllMutation,
  useRegenerateMutation,
} from "@/hooks/useAIQueries";

interface RFPEditorProps {
  rfpId: string;
}

export function RFPEditor({ rfpId }: RFPEditorProps) {
  const questions = useRFPStore((s) => s.questions);
  const isGeneratingAll = useRFPStore((s) => s.isGeneratingAll);
  const updateAnswer = useRFPStore((s) => s.updateAnswer);
  const updateSources = useRFPStore((s) => s.updateSources);
  const setQuestionStatus = useRFPStore((s) => s.setQuestionStatus);
  const setGeneratingAll = useRFPStore((s) => s.setGeneratingAll);
  const bulkUpdateAnswers = useRFPStore((s) => s.bulkUpdateAnswers);

  const parentRef = useRef<HTMLDivElement>(null);

  const generateAllMutation = useGenerateAllMutation();
  const regenerateMutation = useRegenerateMutation();

  // TanStack Virtual returns unstable function refs; React Compiler skips memoization here by design.
  // eslint-disable-next-line react-hooks/incompatible-library -- useVirtualizer is intentional
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
        { documentId: rfpId, questionId: id },
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
    [rfpId, setQuestionStatus, updateAnswer, updateSources, regenerateMutation]
  );

  const handleGenerateAll = useCallback(() => {
    setGeneratingAll(true);

    const targetIds = questions
      .filter((q) => q.status === "idle")
      .map((q) => q.id);

    targetIds.forEach((id) => setQuestionStatus(id, "generating"));

    generateAllMutation.mutate(
      { documentId: rfpId, questions },
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
    rfpId,
    questions,
    setGeneratingAll,
    setQuestionStatus,
    bulkUpdateAnswers,
    generateAllMutation,
  ]);

  const handleSave = useCallback(() => {
    toast.success("Changes saved successfully");
  }, []);

  const handleExport = useCallback(() => {
    toast.info("Export functionality coming soon");
  }, []);

  return (
    <div className="flex h-full flex-col bg-muted/40">
      <EditorHeader
        title={`RFP Project - ${rfpId}.xlsx`}
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
