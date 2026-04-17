"use client";

import { Sparkles, Loader2, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ExcelTableHeaderProps {
  fileName: string;
  sheetCount: number;
  isAutoFilling: boolean;
  onAutoFill: () => void;
}

export function ExcelTableHeader({
  fileName,
  sheetCount,
  isAutoFilling,
  onAutoFill,
}: ExcelTableHeaderProps) {
  return (
    <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur-sm px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
            <FileSpreadsheet className="size-4 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">{fileName}</h1>
            <p className="text-xs text-muted-foreground">
              {sheetCount} {sheetCount === 1 ? "sheet" : "sheets"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={onAutoFill}
            disabled={isAutoFilling}
          >
            {isAutoFilling ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Sparkles />
            )}
            {isAutoFilling ? "Filling..." : "Auto-Fill with AI"}
          </Button>
        </div>
      </div>
    </div>
  );
}
