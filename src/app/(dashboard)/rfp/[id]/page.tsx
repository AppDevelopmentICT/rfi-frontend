import { RFPTechnicalEditor } from "@/components/editor/RFPTechnicalEditor";

interface RfpEditorPageProps {
  params: Promise<{ id: string }>;
}

export default async function RfpEditorPage({ params }: RfpEditorPageProps) {
  const { id } = await params;

  return (
    <div className="h-full overflow-hidden px-6 py-6">
      <RFPTechnicalEditor rfpId={id} />
    </div>
  );
}
