"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Package } from "lucide-react";
import { toast } from "sonner";
import { useRFPStore } from "@/store/useRFPStore";
import { ProductCombobox } from "@/components/shared/ProductCombobox";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { createOrGetRfpProject } from "@/services/rfp.service";

function getErrorMessage(error: unknown, fallback = "Failed to create RFP project") {
  if (error instanceof Error) return error.message;
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: { data?: { detail?: unknown } } }).response?.data?.detail === "string"
  ) {
    return String((error as { response: { data: { detail: string } } }).response.data.detail);
  }
  return fallback;
}

export default function UploadRfpPage() {
  const [product, setProduct] = useState("");
  const [productKnown, setProductKnown] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();
  const setProductInfo = useRFPStore((s) => s.setProductInfo);
  const resetTechnical = useRFPStore((s) => s.resetTechnical);

  const handleProcess = async () => {
    if (!product.trim()) return;
    setIsSubmitting(true);
    try {
      resetTechnical();
      const productName = product.trim();
      const trimmedProjectName = projectName.trim();
      const trimmedProjectDescription = projectDescription.trim();
      setProductInfo(productName, trimmedProjectName, trimmedProjectDescription);
      const project = await createOrGetRfpProject({
        product: productName,
        project_name: trimmedProjectName || undefined,
        project_description: trimmedProjectDescription || undefined,
      });
      router.push(`/rfp/${encodeURIComponent(project.slug || String(project.id))}`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Create RFP Proposal</CardTitle>
          <CardDescription>
            Enter the product and project details to generate a technical
            proposal (Chapter 3) using AI. The AI will stream the response in
            real-time, and you can adjust it afterwards.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Product / Technology <span className="text-destructive">*</span>
            </label>
            <ProductCombobox
              value={product}
              onChange={setProduct}
              onKnownChange={setProductKnown}
              placeholder="e.g. Mendix, SAP S/4HANA, Cybersecurity Suite"
            />
            {product.trim() && !productKnown ? (
              <p className="text-xs text-amber-600">
                This product has no Knowledge Base documents yet. The AI can still answer, but it will warn that no product knowledge is available.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Pick the product name used in Knowledge Base documents for best RAG results.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Project Name</label>
            <Input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. Digital Transformation Initiative 2026"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Project Description</label>
            <Textarea
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder="Brief description of the project scope, objectives, and requirements..."
              className="min-h-[100px] resize-none"
            />
          </div>

          <Button
            className="w-full"
            size="lg"
            disabled={!product.trim() || isSubmitting}
            onClick={handleProcess}
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Package />}
            {isSubmitting ? "Preparing Project..." : "Start Technical Proposal"}
          </Button>
        </CardContent>

        <CardFooter>
          <p className="text-xs text-muted-foreground">
            The AI will generate Chapter 3: Technical Content covering
            architecture, implementation, integration, security, scalability,
            and maintenance.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
