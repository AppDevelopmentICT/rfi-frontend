"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRFIStore } from "@/store/useRFIStore";
import { useExcelStore } from "@/store/useExcelStore";
import { RFIEditor } from "@/components/editor/RFIEditor";

export default function RfiViewerPage() {
  const router = useRouter();
  const documentId = useRFIStore((s) => s.documentId);
  const file = useRFIStore((s) => s.file);
  const fileBase64 = useRFIStore((s) => s.fileBase64);
  const fileName = useRFIStore((s) => s.fileName);
  const excelData = useExcelStore((s) => s.excelData);

  const hasSession = !!(file || fileBase64) && !!(fileName);
  const hasData = !!excelData;

  useEffect(() => {
    if (!hasSession && !hasData) {
      router.replace("/rfi/upload");
    }
  }, [hasSession, hasData, router]);

  if (!hasSession && !hasData) return null;

  return (
    <div className="h-full max-w-none">
      <RFIEditor rfiId={documentId || "local"} />
    </div>
  );
}
