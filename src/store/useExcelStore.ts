import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ExcelData, AutoFillState } from "@/types/excel";

interface ExcelStoreState {
  file: File | null;
  fileName: string;
  excelData: ExcelData | null;
  activeSheet: string;
  autoFillState: AutoFillState;
}

interface ExcelStoreActions {
  setFile: (file: File) => void;
  setExcelData: (data: ExcelData) => void;
  setActiveSheet: (sheet: string) => void;
  updateCell: (sheet: string, rowIdx: number, column: string, value: string) => void;
  setAutoFillState: (state: AutoFillState) => void;
  reset: () => void;
}

type ExcelStore = ExcelStoreState & ExcelStoreActions;

const initialState: ExcelStoreState = {
  file: null,
  fileName: "",
  excelData: null,
  activeSheet: "",
  autoFillState: "idle",
};

export const useExcelStore = create<ExcelStore>()(
  persist(
    (set) => ({
      ...initialState,

  setFile: (file) => set({ file, fileName: file.name }),

  setExcelData: (data) => {
    const sheets = Object.keys(data);
    set({ excelData: data, activeSheet: sheets[0] ?? "" });
  },

  setActiveSheet: (sheet) => set({ activeSheet: sheet }),

  updateCell: (sheet, rowIdx, column, value) =>
    set((state) => {
      if (!state.excelData?.[sheet]) return state;
      const nextData = {
        ...state.excelData,
        [sheet]: {
          ...state.excelData[sheet],
          data: state.excelData[sheet].data.map((row, idx) =>
            idx === rowIdx ? { ...row, [column]: value } : row
          ),
        },
      };
      return { excelData: nextData };
    }),

  setAutoFillState: (autoFillState) => set({ autoFillState }),

  reset: () => set(initialState),
    }),
    {
      name: "excel-store",
      partialize: (state) => ({
        fileName: state.fileName,
        excelData: state.excelData,
        activeSheet: state.activeSheet,
        autoFillState: state.autoFillState,
      }),
    }
  )
);
