import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  uploadDocument,
  generateAll,
  regenerate,
  type UploadDocumentResponse,
  type GenerateAllRequest,
  type GenerateAllResponse,
  type RegenerateRequest,
  type RegenerateResponse,
} from "@/services/ai.service";

export function useUploadDocumentMutation() {
  return useMutation<UploadDocumentResponse, Error, File>({
    mutationFn: uploadDocument,
    onError: () => {
      toast.error("Failed to upload document. Please try again.");
    },
  });
}

export function useGenerateAllMutation() {
  return useMutation<GenerateAllResponse, Error, GenerateAllRequest>({
    mutationFn: generateAll,
    onError: () => {
      toast.error("Failed to generate answers. Please try again.");
    },
  });
}

export function useRegenerateMutation() {
  return useMutation<RegenerateResponse, Error, RegenerateRequest>({
    mutationFn: regenerate,
    onError: () => {
      toast.error("Failed to regenerate answer.");
    },
  });
}
