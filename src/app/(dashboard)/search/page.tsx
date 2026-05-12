"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Download, FileText, Loader2, Search } from "lucide-react";

import { RelativeTime } from "@/components/shared/RelativeTime";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { UserPill } from "@/components/shared/UserPill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/axios";
import { listKnowledgeDocuments, type KBDocument } from "@/services/knowledge.service";
import { downloadBlob, listRfiDocuments, type RFIProjectResponse } from "@/services/rfi.service";
import { listRfpProjects, type RFPProjectResponse } from "@/services/rfp.service";

const PdfPreviewSheet = dynamic(() => import("./PdfPreviewSheet"), { ssr: false });

type SearchTab = "rfi" | "rfp" | "documents";

function matches(text: string | null | undefined, query: string) {
  return (text || "").toLowerCase().includes(query);
}

function GlobalSearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<SearchTab>("rfi");
  const [rfi, setRfi] = useState<RFIProjectResponse[]>([]);
  const [rfp, setRfp] = useState<RFPProjectResponse[]>([]);
  const [documents, setDocuments] = useState<KBDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewDoc, setPreviewDoc] = useState<KBDocument | null>(null);

  const loadResults = useCallback(async () => {
    setIsLoading(true);
    try {
      const [rfiRows, rfpRows, kbRows] = await Promise.all([
        listRfiDocuments(),
        listRfpProjects(),
        listKnowledgeDocuments({ search: query, per_page: 100 }),
      ]);
      setRfi(rfiRows);
      setRfp(rfpRows);
      setDocuments(kbRows.documents);
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadResults();
  }, [loadResults]);

  const needle = query.trim().toLowerCase();
  const rfiResults = useMemo(() => {
    if (!needle) return rfi;
    return rfi.filter((row) => matches(row.fileName || row.filename, needle));
  }, [needle, rfi]);

  const rfpResults = useMemo(() => {
    if (!needle) return rfp;
    return rfp.filter((row) =>
      matches(row.product, needle) ||
      matches(row.project_name, needle) ||
      matches(row.project_description, needle)
    );
  }, [needle, rfp]);

  const tabs: Array<{ id: SearchTab; label: string; count: number }> = [
    { id: "rfi", label: "RFI", count: rfiResults.length },
    { id: "rfp", label: "RFP", count: rfpResults.length },
    { id: "documents", label: "Documents", count: documents.length },
  ];

  const openPreview = (doc: KBDocument) => {
    setPreviewDoc(doc);
  };

  const downloadDocument = async (doc: KBDocument) => {
    const res = await apiClient.get<Blob>(`/v1/knowledge/download/${encodeURIComponent(doc.filename)}`, {
      responseType: "blob",
    });
    downloadBlob(res.data, doc.filename);
  };

  return (
    <div className="flex-1 space-y-6 px-6 py-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Search RFI, RFP, and Documents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search across generated RFI files, saved RFP Chapter 3 responses, and Knowledge Base documents.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <form action="/search" className="relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by document, product, project, or filename..."
              className="pl-9"
            />
          </form>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "outline"}
            onClick={() => setActiveTab(tab.id)}
            className="gap-2"
          >
            {tab.label}
            <Badge variant={activeTab === tab.id ? "secondary" : "outline"}>{tab.count}</Badge>
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border py-16 text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin" />
          Searching...
        </div>
      ) : (
        <>
          {activeTab === "rfi" && (
            <div className="grid gap-3">
              {rfiResults.map((row) => (
                <Card key={row.documentId}>
                  <CardContent className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-primary" />
                        <Link href={`/rfi/${row.documentId}`} className="truncate font-medium hover:underline">
                          {row.fileName || row.filename}
                        </Link>
                        <StatusBadge status={row.status} />
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                        <UserPill name={row.user?.name} email={row.user?.email} />
                        <RelativeTime iso={row.updated_at || row.created_at} />
                      </div>
                    </div>
                    <Link href={`/rfi/${row.documentId}`}>
                      <Button variant="outline" size="sm">
                        Open RFI
                        <ArrowRight className="size-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
              {rfiResults.length === 0 && <EmptyState label="No RFI results found" />}
            </div>
          )}

          {activeTab === "rfp" && (
            <div className="grid gap-3">
              {rfpResults.map((row) => (
                <Card key={row.documentId}>
                  <CardContent className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <MessageBadge label={row.product} />
                        <Link href={`/rfp/${row.documentId}`} className="truncate font-medium hover:underline">
                          {row.project_name || `${row.product} Chapter 3`}
                        </Link>
                        <StatusBadge status={row.status} />
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {row.project_description || "Saved Chapter 3 RFP response"}
                      </p>
                    </div>
                    <Link href={`/rfp/${row.documentId}`}>
                      <Button variant="outline" size="sm">
                        Open RFP
                        <ArrowRight className="size-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
              {rfpResults.length === 0 && <EmptyState label="No RFP results found" />}
            </div>
          )}

          {activeTab === "documents" && (
            <div className="grid gap-3">
              {documents.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-primary" />
                        <span className="truncate font-medium">{doc.filename}</span>
                        <Badge variant="outline">{doc.product || "Unassigned"}</Badge>
                        <StatusBadge status={doc.status} />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Source: {doc.source} · <RelativeTime iso={doc.created_at} />
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => openPreview(doc)}>
                        Preview
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => downloadDocument(doc)}>
                        <Download className="size-4" />
                        Download
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {documents.length === 0 && <EmptyState label="No Knowledge Base documents found" />}
            </div>
          )}
        </>
      )}

      <PdfPreviewSheet
        doc={previewDoc}
        open={Boolean(previewDoc)}
        onOpenChange={(open) => !open && setPreviewDoc(null)}
      />
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function MessageBadge({ label }: { label: string }) {
  return <Badge variant="secondary">{label}</Badge>;
}

export default function GlobalSearchPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16 text-muted-foreground">Loading search...</div>}>
      <GlobalSearchContent />
    </Suspense>
  );
}
