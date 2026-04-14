import { create } from "zustand";
import type { RFIQuestion, QuestionStatus } from "@/types/rfi";

interface RFIStoreState {
  questions: RFIQuestion[];
  isGeneratingAll: boolean;
}

interface RFIStoreActions {
  setQuestions: (questions: RFIQuestion[]) => void;
  updateAnswer: (id: string, answer: string) => void;
  setQuestionStatus: (id: string, status: QuestionStatus) => void;
  setGeneratingAll: (value: boolean) => void;
  bulkUpdateAnswers: (results: { id: string; answer: string }[]) => void;
  resetQuestions: () => void;
}

type RFIStore = RFIStoreState & RFIStoreActions;

export const useRFIStore = create<RFIStore>()((set) => ({
  questions: [],
  isGeneratingAll: false,

  setQuestions: (questions) => set({ questions }),

  updateAnswer: (id, answer) =>
    set((state) => ({
      questions: state.questions.map((q) =>
        q.id === id ? { ...q, answer } : q
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
      const resultMap = new Map(results.map((r) => [r.id, r.answer]));
      return {
        questions: state.questions.map((q) => {
          const answer = resultMap.get(q.id);
          return answer !== undefined
            ? { ...q, answer, originalAnswer: answer, status: "completed" as QuestionStatus }
            : q;
        }),
      };
    }),

  resetQuestions: () => set({ questions: [], isGeneratingAll: false }),
}));
