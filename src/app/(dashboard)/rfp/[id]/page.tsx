import { RFPTechnicalEditor } from "@/components/editor/RFPTechnicalEditor";

interface RfpEditorPageProps {
  params: Promise<{ id: string }>;
}

export default async function RfpEditorPage({ params }: RfpEditorPageProps) {
  const { id } = await params;

  return (
    <div className="-m-4 md:-m-8 h-full">
      <RFPTechnicalEditor rfpId={id} />
    </div>
  );
}
