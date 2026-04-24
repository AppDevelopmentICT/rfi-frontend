import { create } from "zustand";
import type { RFIQuestion, QuestionStatus } from "@/types/rfi";

interface RFIStoreState {
  documentId: string;
  file: File | null;
  fileName: string;
  questions: RFIQuestion[];
  isGeneratingAll: boolean;
}

interface RFIStoreActions {
  setDocumentInfo: (documentId: string, file: File) => void;
  setQuestions: (questions: RFIQuestion[]) => void;
  updateAnswer: (id: string, answer: string) => void;
  updateSources: (id: string, sources: string[]) => void;
  setQuestionStatus: (id: string, status: QuestionStatus) => void;
  setGeneratingAll: (value: boolean) => void;
  bulkUpdateAnswers: (results: { id: string; answer: string; sources?: string[] }[]) => void;
  reset: () => void;
}

type RFIStore = RFIStoreState & RFIStoreActions;

const initialState: RFIStoreState = {
  documentId: "",
  file: null,
  fileName: "",
  questions: [],
  isGeneratingAll: false,
};

export const useRFIStore = create<RFIStore>()((set) => ({
  ...initialState,

  setDocumentInfo: (documentId, file) =>
    set({ documentId, file, fileName: file.name }),

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

  reset: () => set(initialState),
}));
