"use client";

import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import type { ExcelData } from "@/types/excel";
import type { Question, QuestionStatus } from "@/types/question";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface ColumnPickerModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (questions: Question[]) => void;
  excelData: ExcelData;
  fileName: string;
}

export function ColumnPickerModal({
  open,
  onClose,
  onConfirm,
  excelData,
  fileName,
}: ColumnPickerModalProps) {
  const sheetNames = Object.keys(excelData);
  const [activeSheet, setActiveSheet] = useState(sheetNames[0] ?? "");
  const [selections, setSelections] = useState<Record<string, string>>({});

  const allSheetsSelected = sheetNames.every((name) => selections[name]);

  const handleSelect = (sheetName: string, header: string) => {
    setSelections((prev) => ({ ...prev, [sheetName]: header }));
  };

  const handleConfirm = () => {
    let counter = 1;
    const questions: Question[] = [];

    for (const sheetName of sheetNames) {
      const selectedColumn = selections[sheetName];
      if (!selectedColumn) continue;

      const data = excelData[sheetName].data;
      for (const row of data) {
        const value = row[selectedColumn];
        if (value === undefined || value === null || String(value).trim() === "")
          continue;

        questions.push({
          id: crypto.randomUUID(),
          number: counter++,
          question: String(value).trim(),
          answer: "",
          originalAnswer: "",
          status: "idle" as QuestionStatus,
          sources: [],
        });
      }
    }

    onConfirm(questions);
  };

  const activeHeaders = activeSheet ? (excelData[activeSheet]?.headers ?? []) : [];
  const activeData = activeSheet ? (excelData[activeSheet]?.data ?? []) : [];

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="sm:max-w-lg w-full sm:max-w-lg"
        showCloseButton
      >
        <SheetHeader>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="size-4 text-primary" />
            <SheetTitle>Select Question Column</SheetTitle>
          </div>
          <SheetDescription>
            Choose which column contains the questions for{" "}
            <span className="font-medium text-foreground">{fileName}</span>
          </SheetDescription>
        </SheetHeader>

        {sheetNames.length > 1 && (
          <div className="flex gap-1 border-b px-4">
            {sheetNames.map((name) => (
              <Button
                key={name}
                variant="ghost"
                size="sm"
                onClick={() => setActiveSheet(name)}
                className={
                  activeSheet === name
                    ? "border-b-2 border-primary rounded-none text-foreground"
                    : "text-muted-foreground rounded-none"
                }
              >
                {name}
                {selections[name] && (
                  <Badge variant="secondary" className="ml-1.5 text-[10px] px-1">
                    1
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        )}

        <ScrollArea className="flex-1 px-4">
          <div className="space-y-2 py-2">
            {activeHeaders.map((header) => {
              const isSelected = selections[activeSheet] === header;
              const previewValues = activeData
                .slice(0, 3)
                .map((row) => String(row[header] ?? ""))
                .filter((v) => v.trim() !== "");

              return (
                <button
                  key={header}
                  type="button"
                  onClick={() => handleSelect(activeSheet, header)}
                  className={`w-full text-left rounded-lg border p-3 transition-colors cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/40"
                      }`}
                    >
                      {isSelected && (
                        <div className="size-1.5 rounded-full bg-current" />
                      )}
                    </div>
                    <Label className="cursor-pointer font-medium">
                      {header}
                    </Label>
                    <Badge variant="outline" className="ml-auto text-[10px]">
                      {activeData.filter(
                        (row) =>
                          row[header] !== undefined &&
                          row[header] !== null &&
                          String(row[header]).trim() !== ""
                      ).length}{" "}
                      rows
                    </Badge>
                  </div>
                  {previewValues.length > 0 && (
                    <div className="mt-2 ml-6 space-y-0.5">
                      {previewValues.map((val, i) => (
                        <p
                          key={i}
                          className="text-xs text-muted-foreground truncate"
                        >
                          {val}
                        </p>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </ScrollArea>

        <Separator />

        <SheetFooter className="flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!allSheetsSelected}
            className="flex-1"
          >
            Confirm
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
