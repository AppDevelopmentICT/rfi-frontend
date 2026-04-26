import { create } from "zustand";
import type { RFPQuestion, QuestionStatus } from "@/types/rfp";

type GenerationPhase = "idle" | "generating" | "adjusting" | "completed" | "error";

interface RFPStoreState {
  questions: RFPQuestion[];
  isGeneratingAll: boolean;

  product: string;
  projectName: string;
  projectDescription: string;
  technicalContent: string;
  streamingContent: string;
  phase: GenerationPhase;
  errorMessage: string;
}

interface RFPStoreActions {
  setQuestions: (questions: RFPQuestion[]) => void;
  updateAnswer: (id: string, answer: string) => void;
  updateSources: (id: string, sources: string[]) => void;
  setQuestionStatus: (id: string, status: QuestionStatus) => void;
  setGeneratingAll: (value: boolean) => void;
  bulkUpdateAnswers: (results: { id: string; answer: string; sources?: string[] }[]) => void;
  resetQuestions: () => void;

  setProductInfo: (product: string, projectName: string, projectDescription: string) => void;
  appendChunk: (chunk: string) => void;
  clearStreamingContent: () => void;
  setTechnicalContent: (content: string) => void;
  setPhase: (phase: GenerationPhase) => void;
  setErrorMessage: (msg: string) => void;
  resetTechnical: () => void;
}

type RFPStore = RFPStoreState & RFPStoreActions;

const initialState: RFPStoreState = {
  questions: [],
  isGeneratingAll: false,
  product: "",
  projectName: "",
  projectDescription: "",
  technicalContent: "",
  streamingContent: "",
  phase: "idle",
  errorMessage: "",
};

export const useRFPStore = create<RFPStore>()((set) => ({
  ...initialState,

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

  setProductInfo: (product, projectName, projectDescription) =>
    set({ product, projectName, projectDescription }),

  appendChunk: (chunk) =>
    set((state) => ({
      streamingContent: state.streamingContent + chunk,
    })),

  clearStreamingContent: () => set({ streamingContent: "" }),

  setTechnicalContent: (content) =>
    set({ technicalContent: content, streamingContent: content }),

  setPhase: (phase) => set({ phase }),

  setErrorMessage: (msg) => set({ errorMessage: msg }),

  resetTechnical: () =>
    set({
      technicalContent: "",
      streamingContent: "",
      phase: "idle",
      errorMessage: "",
    }),
}));
