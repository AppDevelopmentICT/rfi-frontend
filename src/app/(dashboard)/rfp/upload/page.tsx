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

  const handleProcess = () => {
    if (!product.trim() || isSubmitting) return;
    setIsSubmitting(true);
    const productName = product.trim();
    const trimmedProjectName = projectName.trim();
    const trimmedProjectDescription = projectDescription.trim();
    resetTechnical();
    setProductInfo(productName, trimmedProjectName, trimmedProjectDescription);
    createOrGetRfpProject({
      product: productName,
      project_name: trimmedProjectName || undefined,
      project_description: trimmedProjectDescription || undefined,
    })
      .then((project) => {
        const key = encodeURIComponent(project.slug || String(project.id));
        router.push(project.created ? `/rfp/${key}?generate=1` : `/rfp/${key}`);
      })
      .catch((error: unknown) => {
        toast.error(getErrorMessage(error));
        setIsSubmitting(false);
      });
  };

  if (isSubmitting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-in fade-in duration-300">
        <div className="relative flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <Package className="absolute h-5 w-5 text-primary/60" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-lg font-medium">Preparing your project…</p>
          <p className="text-sm text-muted-foreground">Setting up workspace and redirecting</p>
        </div>
      </div>
    );
  }

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
            disabled={!product.trim()}
            onClick={handleProcess}
          >
            <Package />
            Start Technical Proposal
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
