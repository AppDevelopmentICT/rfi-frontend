"use client";

import { useExcelStore } from "@/store/useExcelStore";
import { cn } from "@/lib/utils";

interface ExcelTableProps {
  isGenerated?: boolean;
  documentId?: string;
  readOnly?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}

export function ExcelTable({
  isGenerated = false,
  readOnly = false,
  onDirtyChange,
}: ExcelTableProps) {
  const excelData = useExcelStore((s) => s.excelData);
  const activeSheet = useExcelStore((s) => s.activeSheet);
  const setActiveSheet = useExcelStore((s) => s.setActiveSheet);
  const updateLocalCell = useExcelStore((s) => s.updateCell);

  if (!excelData) return null;

  const sheetNames = Object.keys(excelData);
  const currentSheet = excelData[activeSheet];

  if (!currentSheet) return null;

  const { headers, data } = currentSheet;

  return (
    <div className="flex flex-col gap-4">
      {/* Sheet tabs */}
      {sheetNames.length > 1 && (
        <div className="flex items-center gap-0">
          {sheetNames.map((name) => (
            <button
              key={name}
              onClick={() => setActiveSheet(name)}
              className={cn(
                "relative px-4 py-2.5 text-sm font-medium transition-colors",
                name === activeSheet
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {name}
              {name === activeSheet && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Data summary */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-md bg-muted/60 px-2.5 py-1 text-xs font-medium text-muted-foreground tabular-nums">
          {data.length} rows
        </span>
        <span className="inline-flex items-center rounded-md bg-muted/60 px-2.5 py-1 text-xs font-medium text-muted-foreground tabular-nums">
          {headers.length} columns
        </span>
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-lg border border-border/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30">
              {headers.map((header, idx) => (
                <th
                  key={idx}
                  className="whitespace-nowrap px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={cn(
                  "border-b border-border/40 transition-colors last:border-0",
                  rowIdx % 2 === 1 && "bg-muted/20"
                )}
              >
                {headers.map((header, colIdx) => {
                  const value = row[header];
                  const isEmpty =
                    value === null ||
                    value === undefined ||
                    String(value).trim() === "";

                  return (
                    <td
                      key={colIdx}
                      className={cn(
                        "max-w-xs px-4 py-4 align-top leading-relaxed",
                        isEmpty
                          ? "text-muted-foreground/60 italic"
                          : "text-foreground",
                        isGenerated && !readOnly ? "hover:bg-muted/50 cursor-text" : "truncate"
                      )}
                      contentEditable={isGenerated && !readOnly}
                      suppressContentEditableWarning={true}
                      onBlur={(e) => {
                        if (!isGenerated || readOnly) return;
                        const newValue = e.target.innerText;
                        if (newValue !== String(value || "")) {
                          updateLocalCell(activeSheet, rowIdx, header, newValue);
                          onDirtyChange?.(true);
                        }
                      }}
                      title={isEmpty ? "(empty)" : String(value)}
                    >
                      {isEmpty && !isGenerated ? "—" : String(value || "")}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty state */}
      {data.length === 0 && (
        <div className="flex items-center justify-center rounded-lg border border-dashed py-12 text-muted-foreground">
          This sheet is empty.
        </div>
      )}
    </div>
  );
}
