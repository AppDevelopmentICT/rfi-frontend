import { create } from "zustand";
import type { RFPQuestion, QuestionStatus } from "@/types/rfp";

interface RFPStoreState {
  questions: RFPQuestion[];
  isGeneratingAll: boolean;
}

interface RFPStoreActions {
  setQuestions: (questions: RFPQuestion[]) => void;
  updateAnswer: (id: string, answer: string) => void;
  setQuestionStatus: (id: string, status: QuestionStatus) => void;
  setGeneratingAll: (value: boolean) => void;
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

  setQuestionStatus: (id, status) =>
    set((state) => ({
      questions: state.questions.map((q) =>
        q.id === id ? { ...q, status } : q
      ),
    })),

  setGeneratingAll: (value) => set({ isGeneratingAll: value }),

  resetQuestions: () => set({ questions: [], isGeneratingAll: false }),
}));
