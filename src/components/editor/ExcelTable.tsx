"use client";

import { useExcelStore } from "@/store/useExcelStore";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function ExcelTable() {
  const excelData = useExcelStore((s) => s.excelData);
  const activeSheet = useExcelStore((s) => s.activeSheet);
  const setActiveSheet = useExcelStore((s) => s.setActiveSheet);

  if (!excelData) return null;

  const sheetNames = Object.keys(excelData);
  const currentSheet = excelData[activeSheet];

  if (!currentSheet) return null;

  const { headers, data } = currentSheet;

  return (
    <div className="flex flex-col gap-4">
      {/* Sheet tabs */}
      {sheetNames.length > 1 && (
        <div className="flex items-center gap-1 border-b pb-2">
          {sheetNames.map((name) => (
            <button
              key={name}
              onClick={() => setActiveSheet(name)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                name === activeSheet
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {/* Data summary */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="tabular-nums">
          {data.length} rows
        </Badge>
        <Badge variant="outline" className="tabular-nums">
          {headers.length} columns
        </Badge>
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {headers.map((header, idx) => (
                <th
                  key={idx}
                  className="whitespace-nowrap px-4 py-3 text-left font-semibold text-foreground"
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
                className="border-b transition-colors hover:bg-muted/30 last:border-0"
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
                        "max-w-xs truncate px-4 py-3",
                        isEmpty
                          ? "bg-amber-500/5 text-muted-foreground italic"
                          : "text-foreground"
                      )}
                      title={isEmpty ? "(empty)" : String(value)}
                    >
                      {isEmpty ? "—" : String(value)}
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
