import { RFPEditor } from "@/components/editor/RFPEditor";

interface RfpEditorPageProps {
  params: Promise<{ id: string }>;
}

export default async function RfpEditorPage({ params }: RfpEditorPageProps) {
  const { id } = await params;

  return <RFPEditor rfpId={id} />;
}
