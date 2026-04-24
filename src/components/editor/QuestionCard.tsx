"use client";

import { useState, useEffect, useRef, useCallback, memo } from "react";
import { Sparkles, Loader2, Database } from "lucide-react";
import type { Question } from "@/types/question";
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface QuestionCardProps {
  question: Question;
  onAnswerChange: (id: string, answer: string) => void;
  onRegenerate: (id: string) => void;
}

export const QuestionCard = memo(function QuestionCard({
  question,
  onAnswerChange,
  onRegenerate,
}: QuestionCardProps) {
  const [localAnswer, setLocalAnswer] = useState(question.answer);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Sync from store when answer changes externally (e.g., after regenerate)
  useEffect(() => {
    setLocalAnswer(question.answer);
  }, [question.answer]);

  const debouncedUpdate = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onAnswerChange(question.id, value);
      }, 500);
    },
    [question.id, onAnswerChange]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setLocalAnswer(value);
      debouncedUpdate(value);
    },
    [debouncedUpdate]
  );

  const handleBlur = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onAnswerChange(question.id, localAnswer);
  }, [question.id, localAnswer, onAnswerChange]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const isEdited =
    question.status === "completed" &&
    localAnswer !== question.originalAnswer &&
    localAnswer.trim() !== "";

  const isGenerating = question.status === "generating";

  return (
    <div>
      <Card size="sm" className="transition-shadow hover:shadow-md">
        <CardHeader>
          <div className="flex items-start gap-3">
            <Badge variant="secondary" className="mt-0.5 shrink-0 tabular-nums">
              {question.number}
            </Badge>
            <CardTitle className="text-sm leading-relaxed">{question.question}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={localAnswer}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={isGenerating}
            className="min-h-30 resize-none text-sm leading-relaxed"
            placeholder={isGenerating ? "Generating answer..." : "AI-generated answer will appear here..."}
          />
        </CardContent>
        <CardFooter className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {isGenerating && (
              <Badge variant="secondary">
                <Loader2 className="animate-spin" />
                Generating...
              </Badge>
            )}
            {!isGenerating && isEdited && (
              <Badge variant="outline">Edited</Badge>
            )}
            {!isGenerating && !isEdited && question.status === "completed" && (
              <Badge variant="secondary">AI Generated</Badge>
            )}
            {question.status === "idle" && (
              <Badge variant="ghost">Not started</Badge>
            )}
            {!isGenerating && question.sources.length > 0 && (
              <Badge
                variant="secondary"
                className="max-w-[320px] text-muted-foreground"
                title={question.sources.join(", ")}
              >
                <Database className="shrink-0" />
                <span className="truncate">
                  {question.sources.map((source, i) => (
                    <a
                      key={source}
                      href={`/api/v1/knowledge/download/${encodeURIComponent(source)}`}
                      download
                      onClick={(e) => e.stopPropagation()}
                      className="underline-offset-2 hover:underline hover:text-foreground"
                    >
                      {source}
                    </a>
                  )).reduce<React.ReactNode[]>((acc, cur, i) => {
                    if (i === 0) return [cur];
                    return [...acc, ", ", cur];
                  }, [])}
                </span>
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => onRegenerate(question.id)}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Sparkles />
            )}
            Regenerate
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
});
