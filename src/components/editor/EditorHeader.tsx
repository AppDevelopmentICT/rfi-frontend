"use client";

import { Sparkles, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface EditorHeaderProps {
  title: string;
  questionCount: number;
  isGeneratingAll: boolean;
  /** Primary action label when idle (default: Generate All) */
  generateAllLabel?: string;
  /** Primary action label while running (default: Generating...) */
  generatingLabel?: string;
  onGenerateAll: () => void;
  onSave?: () => void;
  onExport?: () => void;
}

export function EditorHeader({
  title,
  questionCount,
  isGeneratingAll,
  generateAllLabel = "Generate All",
  generatingLabel = "Generating...",
  onGenerateAll,
  onExport,
}: EditorHeaderProps) {
  return (
    <div className="flex shrink-0 items-center justify-between border-b bg-background/95 px-6 py-3 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        <Badge variant="secondary">
          {questionCount > 0 ? `${questionCount} questions` : "Excel file"}
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        {onExport && (
          <Button variant="outline" size="sm" onClick={onExport} disabled={isGeneratingAll}>
            <Download className="size-4" />
            Export Excel
          </Button>
        )}
        <Button
          variant="default"
          size="sm"
          onClick={onGenerateAll}
          disabled={isGeneratingAll}
        >
          {isGeneratingAll ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Sparkles />
          )}
          {isGeneratingAll ? generatingLabel : generateAllLabel}
        </Button>
      </div>
    </div>
  );
}
