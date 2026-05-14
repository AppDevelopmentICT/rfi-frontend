import { RFIPdfEditor } from "@/components/editor/RFIPdfEditor";

interface RfiPdfPageProps {
  params: Promise<{ id: string }>;
}

export default async function RfiPdfPage({ params }: RfiPdfPageProps) {
  const { id } = await params;
  return (
    <div className="h-full min-h-0">
      <RFIPdfEditor documentId={id} />
    </div>
  );
}
