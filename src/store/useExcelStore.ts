import { create } from "zustand";
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

export const useExcelStore = create<ExcelStore>()((set) => ({
  ...initialState,

  setFile: (file) => set({ file, fileName: file.name }),

  setExcelData: (data) => {
    const sheets = Object.keys(data);
    set({ excelData: data, activeSheet: sheets[0] ?? "" });
  },

  setActiveSheet: (sheet) => set({ activeSheet: sheet }),

  setAutoFillState: (autoFillState) => set({ autoFillState }),

  reset: () => set(initialState),
}));
