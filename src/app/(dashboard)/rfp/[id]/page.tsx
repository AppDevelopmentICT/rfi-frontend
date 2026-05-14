import { RFPTechnicalEditor } from "@/components/editor/RFPTechnicalEditor";

interface RfpEditorPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ generate?: string }>;
}

export default async function RfpEditorPage({ params, searchParams }: RfpEditorPageProps) {
  const { id } = await params;
  const { generate } = await searchParams;

  return (
    <div className="h-full min-h-0">
      <RFPTechnicalEditor rfpId={id} autoGenerate={generate === "1"} />
    </div>
  );
}
