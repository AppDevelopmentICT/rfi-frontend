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
  /** In-memory object URL — never persisted.  Created via URL.createObjectURL so
   *  the file stays as a blob in the browser's memory rather than a multi-MB
   *  base64 string that would bloat localStorage and RAM. */
  fileObjectUrl: string | null;
  fileName: string;
  questions: RFIQuestion[];
  isGeneratingAll: boolean;
  activeJobs: RFIJob[];
}

interface RFIStoreActions {
  setDocumentInfo: (documentId: string, file: File) => void;
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
  fileObjectUrl: null,
  fileName: "",
  questions: [],
  isGeneratingAll: false,
  activeJobs: [],
};

export const useRFIStore = create<RFIStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setDocumentInfo: (documentId, file) => {
        // Revoke any previous object URL to avoid a memory leak.
        const prev = get().fileObjectUrl;
        if (prev) URL.revokeObjectURL(prev);

        const objectUrl = URL.createObjectURL(file);
        set({ documentId, file, fileObjectUrl: objectUrl, fileName: file.name });
      },

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

      reset: () => {
        const prev = get().fileObjectUrl;
        if (prev) URL.revokeObjectURL(prev);
        set(initialState);
      },
    }),
    {
      name: "rfi-store",
      partialize: (state) => ({
        // Only lightweight metadata survives a page refresh.
        // fileObjectUrl is ephemeral (blob URLs are origin-scoped and
        // invalid after navigation), and the raw File object is not
        // serialisable — so neither is persisted.
        documentId: state.documentId,
        fileName: state.fileName,
        activeJobs: state.activeJobs,
      }),
    }
  )
);
