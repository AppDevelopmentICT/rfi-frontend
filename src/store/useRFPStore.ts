import { create } from "zustand";
import type { RFPQuestion, QuestionStatus } from "@/types/rfp";

interface RFPStoreState {
  questions: RFPQuestion[];
  isGeneratingAll: boolean;
}

interface RFPStoreActions {
  setQuestions: (questions: RFPQuestion[]) => void;
  updateAnswer: (id: string, answer: string) => void;
  updateSources: (id: string, sources: string[]) => void;
  setQuestionStatus: (id: string, status: QuestionStatus) => void;
  setGeneratingAll: (value: boolean) => void;
  bulkUpdateAnswers: (results: { id: string; answer: string; sources?: string[] }[]) => void;
  resetQuestions: () => void;
}

type RFPStore = RFPStoreState & RFPStoreActions;

export const useRFPStore = create<RFPStore>()((set) => ({
  questions: [],
  isGeneratingAll: false,

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

  resetQuestions: () => set({ questions: [], isGeneratingAll: false }),
}));
