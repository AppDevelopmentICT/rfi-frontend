"use client";

import { useEffect, useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { toast } from "sonner";
import { useRFIStore } from "@/store/useRFIStore";
import { MOCK_RFI_QUESTIONS } from "@/types/rfi";
import { EditorHeader } from "@/components/editor/EditorHeader";
import { QuestionCard } from "@/components/editor/QuestionCard";

interface RFIEditorProps {
  rfiId: string;
}

export function RFIEditor({ rfiId }: RFIEditorProps) {
  const questions = useRFIStore((s) => s.questions);
  const isGeneratingAll = useRFIStore((s) => s.isGeneratingAll);
  const setQuestions = useRFIStore((s) => s.setQuestions);
  const updateAnswer = useRFIStore((s) => s.updateAnswer);
  const setQuestionStatus = useRFIStore((s) => s.setQuestionStatus);
  const setGeneratingAll = useRFIStore((s) => s.setGeneratingAll);

  const parentRef = useRef<HTMLDivElement>(null);

  // Initialize with mock data
  useEffect(() => {
    setQuestions(MOCK_RFI_QUESTIONS);
  }, [setQuestions]);

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
      setTimeout(() => {
        updateAnswer(id, "This is a regenerated AI response. In production, this would be replaced by an actual AI-generated answer based on your knowledge base and the specific question context.");
        setQuestionStatus(id, "completed");
        toast.success("Answer regenerated");
      }, 1500 + Math.random() * 1000);
    },
    [setQuestionStatus, updateAnswer]
  );

  const handleGenerateAll = useCallback(() => {
    setGeneratingAll(true);
    let completed = 0;
    const total = questions.length;

    questions.forEach((q, index) => {
      setTimeout(() => {
        setQuestionStatus(q.id, "generating");
        setTimeout(() => {
          updateAnswer(
            q.id,
            "This is a freshly generated AI response. In production, the system would analyze the question against your uploaded knowledge base documents and generate a comprehensive, contextually relevant answer."
          );
          setQuestionStatus(q.id, "completed");
          completed++;
          if (completed === total) {
            setGeneratingAll(false);
            toast.success(`All ${total} answers generated`);
          }
        }, 800 + Math.random() * 1200);
      }, index * 50);
    });
  }, [questions, setGeneratingAll, setQuestionStatus, updateAnswer]);

  const handleSave = useCallback(() => {
    toast.success("Changes saved successfully");
  }, []);

  const handleExport = useCallback(() => {
    toast.info("Export functionality coming soon");
  }, []);

  return (
    <div className="flex h-full flex-col bg-muted/40">
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
