import { RFPTechnicalEditor } from "@/components/editor/RFPTechnicalEditor";

interface RfpEditorPageProps {
  params: Promise<{ id: string }>;
}

export default async function RfpEditorPage({ params }: RfpEditorPageProps) {
  const { id } = await params;

  return (
    <div className="h-full max-w-none">
      <RFPTechnicalEditor rfpId={id} />
    </div>
  );
}
