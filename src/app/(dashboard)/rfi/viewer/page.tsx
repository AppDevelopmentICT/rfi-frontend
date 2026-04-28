"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRFIStore } from "@/store/useRFIStore";
import { RFIEditor } from "@/components/editor/RFIEditor";

export default function RfiViewerPage() {
  const router = useRouter();
  const documentId = useRFIStore((s) => s.documentId);
  const questions = useRFIStore((s) => s.questions);

  useEffect(() => {
    if (!documentId || questions.length === 0) {
      router.replace("/rfi/upload");
    }
  }, [documentId, questions.length, router]);

  if (!documentId || questions.length === 0) return null;

  return (
    <div className="h-full max-w-none">
      <RFIEditor rfiId={documentId} />
    </div>
  );
}
