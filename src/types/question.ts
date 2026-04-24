export type QuestionStatus = "idle" | "generating" | "completed";

export interface Question {
  id: string;
  number: number;
  question: string;
  answer: string;
  originalAnswer: string;
  status: QuestionStatus;
  sources: string[];
}
