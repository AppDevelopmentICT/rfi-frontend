"use client";

import { Sparkles, Save, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface EditorHeaderProps {
  title: string;
  questionCount: number;
  isGeneratingAll: boolean;
  onGenerateAll: () => void;
  onSave: () => void;
  onExport: () => void;
}

export function EditorHeader({
  title,
  questionCount,
  isGeneratingAll,
  onGenerateAll,
  onSave,
  onExport,
}: EditorHeaderProps) {
  return (
    <div className="flex shrink-0 items-center justify-between border-b bg-background/95 px-6 py-3 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        <Badge variant="secondary">{questionCount} questions</Badge>
      </div>
      <div className="flex items-center gap-2">
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
          {isGeneratingAll ? "Generating..." : "Generate All"}
        </Button>
        <Button variant="outline" size="sm" onClick={onSave}>
          <Save />
          Save Changes
        </Button>
        <Button variant="ghost" size="sm" onClick={onExport}>
          <Download />
          Export
        </Button>
      </div>
    </div>
  );
}
