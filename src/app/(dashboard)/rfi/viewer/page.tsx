"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useExcelStore } from "@/store/useExcelStore";
import { useAutoFillMutation } from "@/hooks/useRFIQueries";
import { ExcelTable } from "@/components/editor/ExcelTable";
import { ExcelTableHeader } from "@/components/editor/ExcelTableHeader";

export default function ExcelViewerPage() {
  const router = useRouter();
  const file = useExcelStore((s) => s.file);
  const fileName = useExcelStore((s) => s.fileName);
  const excelData = useExcelStore((s) => s.excelData);
  const autoFillState = useExcelStore((s) => s.autoFillState);
  const setAutoFillState = useExcelStore((s) => s.setAutoFillState);

  const autoFillMutation = useAutoFillMutation();

  // Redirect to upload if no data
  useEffect(() => {
    if (!excelData || !file) {
      router.replace("/rfi/upload");
    }
  }, [excelData, file, router]);

  const handleAutoFill = useCallback(() => {
    if (!file) return;
    setAutoFillState("filling");

    autoFillMutation.mutate(
      { file, originalFileName: fileName },
      {
        onSuccess: () => setAutoFillState("done"),
        onError: () => setAutoFillState("error"),
      }
    );
  }, [file, fileName, setAutoFillState, autoFillMutation]);

  if (!excelData || !file) return null;

  const sheetCount = Object.keys(excelData).length;

  return (
    <div className="flex h-full flex-col">
      <ExcelTableHeader
        fileName={fileName}
        sheetCount={sheetCount}
        isAutoFilling={autoFillState === "filling"}
        onAutoFill={handleAutoFill}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <ExcelTable />
        </div>
      </div>
    </div>
  );
}
