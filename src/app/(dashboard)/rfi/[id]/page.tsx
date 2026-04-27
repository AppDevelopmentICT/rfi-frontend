import { RFIEditor } from "@/components/editor/RFIEditor";

interface RfiEditorPageProps {
  params: Promise<{ id: string }>;
}

export default async function RfiEditorPage({ params }: RfiEditorPageProps) {
  const { id } = await params;

  return (
    <div className="-m-4 h-full md:-m-8">
      <RFIEditor rfiId={id} />
    </div>
  );
}
