import { apiClient } from "@/lib/axios";
import type { Question, QuestionStatus } from "@/types/question";

// ---------------------------------------------------------------------------
// API Types
// ---------------------------------------------------------------------------

export interface UploadDocumentResponse {
  documentId: string;
  questions: Question[];
}

export interface GenerateAllRequest {
  documentId: string;
  questions: Question[];
}

export interface GenerateResult {
  id: string;
  answer: string;
  sources: string[];
}

export interface GenerateAllResponse {
  results: GenerateResult[];
}

export interface RegenerateRequest {
  documentId: string;
  questionId: string;
  prompt?: string;
}

export interface RegenerateResponse {
  id: string;
  answer: string;
  sources: string[];
}

export interface SaveQuestionsRequest {
  questions: Question[];
}

export interface SaveQuestionsResponse {
  documentId: string;
}

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

const isMock = () => process.env.NEXT_PUBLIC_MOCK_API === "true";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const MOCK_QUESTION_TEMPLATES = [
  "Please provide an overview of your company's background, including years of operation, market presence, and core areas of expertise.",
  "Describe your data security measures and compliance certifications (e.g., ISO 27001, SOC 2, GDPR).",
  "How does your solution scale to handle increasing transaction volumes and user loads?",
  "What Service Level Agreement (SLA) guarantees do you provide for system uptime and response times?",
  "Describe your integration capabilities with existing enterprise systems (ERP, CRM, HRIS).",
  "What is your pricing model and are there volume-based discounts available?",
  "Outline your implementation timeline and project methodology.",
  "What support structure do you provide post-implementation (tiers, channels, response times)?",
  "Describe your disaster recovery and business continuity planning.",
  "What customization options are available to tailor the platform to our specific workflows?",
];

const MOCK_ANSWER =
  "Based on our comprehensive knowledge base analysis, this response addresses the key requirements outlined in the question. Our solution leverages industry best practices and proven methodologies to deliver reliable, scalable results. The platform supports seamless integration with existing systems while maintaining robust security and compliance standards.";

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function uploadDocument(
  file: File
): Promise<UploadDocumentResponse> {
  if (isMock()) {
    await delay(1500);
    const questions: Question[] = MOCK_QUESTION_TEMPLATES.map((q, i) => ({
      id: `q-${String(i + 1).padStart(3, "0")}`,
      number: i + 1,
      question: q,
      answer: "",
      originalAnswer: "",
      status: "idle" as QuestionStatus,
      sources: [],
    }));
    return {
      documentId: `mock-doc-${Date.now()}`,
      questions,
    };
  }

  const formData = new FormData();
  formData.append("file", file);

  const { data } = await apiClient.post<UploadDocumentResponse>(
    "/v1/document/upload",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
}

export async function generateAll(
  req: GenerateAllRequest
): Promise<GenerateAllResponse> {
  if (isMock()) {
    await delay(1500);
    return {
      results: req.questions.map((q) => ({
        id: q.id,
        answer: MOCK_ANSWER,
        sources: ["Company_Profile.pdf", "Technical_Capabilities.pdf"],
      })),
    };
  }

  const { data } = await apiClient.post<GenerateAllResponse>(
    "/v1/ai/generate-all",
    req
  );
  return data;
}

export async function regenerate(
  req: RegenerateRequest
): Promise<RegenerateResponse> {
  if (isMock()) {
    await delay(1000);
    return {
      id: req.questionId,
      answer: `${MOCK_ANSWER} (Regenerated at ${new Date().toLocaleTimeString()})`,
      sources: ["Company_Profile.pdf", "Technical_Capabilities.pdf"],
    };
  }

  const { data } = await apiClient.post<RegenerateResponse>(
    "/v1/ai/regenerate",
    req
  );
  return data;
}

export async function saveQuestions(
  req: SaveQuestionsRequest
): Promise<SaveQuestionsResponse> {
  const { data } = await apiClient.post<SaveQuestionsResponse>(
    "/v1/rfi/save",
    req
  );
  return data;
}
