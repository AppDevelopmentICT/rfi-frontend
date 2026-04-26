"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Package } from "lucide-react";
import { useRFPStore } from "@/store/useRFPStore";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function UploadRfpPage() {
  const [product, setProduct] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");

  const router = useRouter();
  const setProductInfo = useRFPStore((s) => s.setProductInfo);
  const resetTechnical = useRFPStore((s) => s.resetTechnical);

  const handleProcess = () => {
    if (!product.trim()) return;
    resetTechnical();
    setProductInfo(product.trim(), projectName.trim(), projectDescription.trim());
    const id = product.trim().toLowerCase().replace(/\s+/g, "-");
    router.push(`/rfp/${encodeURIComponent(id)}`);
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
            <Input
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="e.g. Enterprise Cloud Platform, SAP S/4HANA, Cybersecurity Suite"
            />
            <p className="text-xs text-muted-foreground">
              The main product or technology being proposed.
            </p>
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
