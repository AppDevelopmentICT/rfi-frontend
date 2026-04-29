"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRFIStore } from "@/store/useRFIStore";
import { RFIEditor } from "@/components/editor/RFIEditor";

export default function RfiViewerPage() {
  const router = useRouter();
  const documentId = useRFIStore((s) => s.documentId);
  const file = useRFIStore((s) => s.file);

  useEffect(() => {
    if (!documentId || !file) {
      router.replace("/rfi/upload");
    }
  }, [documentId, file, router]);

  if (!documentId || !file) return null;

  return (
    <div className="h-full max-w-none">
      <RFIEditor rfiId={documentId} />
    </div>
  );
}
