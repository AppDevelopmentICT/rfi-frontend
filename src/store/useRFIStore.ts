import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RFIQuestion, QuestionStatus } from "@/types/rfi";

export interface RFIJob {
  id: string;
  filename: string;
  status: string;
}

interface RFIStoreState {
  documentId: string;
  file: File | null;
  fileBase64: string | null;
  fileName: string;
  questions: RFIQuestion[];
  isGeneratingAll: boolean;
  activeJobs: RFIJob[];
}

interface RFIStoreActions {
  setDocumentInfo: (documentId: string, file: File, base64?: string) => void;
  setQuestions: (questions: RFIQuestion[]) => void;
  updateAnswer: (id: string, answer: string) => void;
  updateSources: (id: string, sources: string[]) => void;
  setQuestionStatus: (id: string, status: QuestionStatus) => void;
  setGeneratingAll: (value: boolean) => void;
  bulkUpdateAnswers: (results: { id: string; answer: string; sources?: string[] }[]) => void;
  addJob: (job: RFIJob) => void;
  updateJob: (id: string, status: string) => void;
  removeJob: (id: string) => void;
  reset: () => void;
}

type RFIStore = RFIStoreState & RFIStoreActions;

const initialState: RFIStoreState = {
  documentId: "",
  file: null,
  fileBase64: null,
  fileName: "",
  questions: [],
  isGeneratingAll: false,
  activeJobs: [],
};

export const useRFIStore = create<RFIStore>()(
  persist(
    (set) => ({
      ...initialState,

  setDocumentInfo: (documentId, file, base64) =>
    set({ documentId, file, fileBase64: base64 || null, fileName: file.name }),

  setQuestions: (questions) => set({ questions }),

  updateAnswer: (id, answer) =>
    set((state) => ({
      questions: state.questions.map((q) =>
        q.id === id ? { ...q, answer } : q
      ),
    })),

  updateSources: (id, sources) =>
    set((state) => ({
      questions: state.questions.map((q) =>
        q.id === id ? { ...q, sources } : q
      ),
    })),

  setQuestionStatus: (id, status) =>
    set((state) => ({
      questions: state.questions.map((q) =>
        q.id === id ? { ...q, status } : q
      ),
    })),

  setGeneratingAll: (value) => set({ isGeneratingAll: value }),

  bulkUpdateAnswers: (results) =>
    set((state) => {
      const resultMap = new Map(
        results.map((r) => [r.id, { answer: r.answer, sources: r.sources ?? [] }])
      );
      return {
        questions: state.questions.map((q) => {
          const data = resultMap.get(q.id);
          return data !== undefined
            ? { ...q, answer: data.answer, originalAnswer: data.answer, sources: data.sources, status: "completed" as QuestionStatus }
            : q;
        }),
      };
    }),

  addJob: (job) => set((state) => ({ activeJobs: [...state.activeJobs, job] })),
  updateJob: (id, status) =>
    set((state) => ({
      activeJobs: state.activeJobs.map((j) =>
        j.id === id ? { ...j, status } : j
      ),
    })),
  removeJob: (id) =>
    set((state) => ({
      activeJobs: state.activeJobs.filter((j) => j.id !== id),
    })),

  reset: () => set(initialState),
    }),
    {
      name: "rfi-store",
      partialize: (state) => ({ 
        activeJobs: state.activeJobs,
        fileBase64: state.fileBase64,
        fileName: state.fileName
      }),
    }
  )
);
