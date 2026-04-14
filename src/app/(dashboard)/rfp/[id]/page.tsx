interface RfpEditorPageProps {
  params: Promise<{ id: string }>;
}

export default async function RfpEditorPage({ params }: RfpEditorPageProps) {
  const { id } = await params;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold tracking-tight">RFP Editor</h1>
      <p className="mt-2 text-muted-foreground">
        Editing RFP: <span className="font-mono text-foreground">{id}</span>
      </p>
    </div>
  );
}
