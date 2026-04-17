/** One sheet's content: column headers + row data. */
export interface SheetData {
  headers: string[];
  data: Record<string, unknown>[];
}

/** All sheets keyed by sheet name. */
export type ExcelData = Record<string, SheetData>;

/** Auto-fill progress state. */
export type AutoFillState = "idle" | "filling" | "done" | "error";
