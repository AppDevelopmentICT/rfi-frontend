import { RFIEditor } from "@/components/editor/RFIEditor";

interface RfiEditorPageProps {
  params: Promise<{ id: string }>;
}

export default async function RfiEditorPage({ params }: RfiEditorPageProps) {
  const { id } = await params;

  return <RFIEditor rfiId={id} />;
}
