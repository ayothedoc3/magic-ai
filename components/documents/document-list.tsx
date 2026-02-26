"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createDocument, deleteDocument } from "@/actions/documents";
import { formatDistanceToNow } from "date-fns";

type Document = {
  id: string;
  title: string;
  content: string | null;
  updatedAt: Date;
};

type DocumentListProps = {
  documents: Document[];
  searchQuery?: string;
};

export function DocumentList({ documents, searchQuery }: DocumentListProps) {
  const router = useRouter();
  const [search, setSearch] = useState(searchQuery || "");
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search);
    router.push(`/documents?${params.toString()}`);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleting(id);
    await deleteDocument(id);
    router.refresh();
    setDeleting(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <form onSubmit={handleSearch} className="flex-1">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents..."
          />
        </form>
        <form action={() => createDocument()}>
          <Button type="submit" className="gap-2">
            <Plus className="h-4 w-4" />
            New Document
          </Button>
        </form>
      </div>

      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="mb-1 text-lg font-medium">No documents found</h3>
          <p className="text-sm text-muted-foreground">
            {searchQuery
              ? "Try a different search term"
              : "Create your first document or generate content to get started"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <Link
              key={doc.id}
              href={`/documents/${doc.id}`}
              className="group flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50"
            >
              <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{doc.title}</p>
                {doc.content && (
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {doc.content.slice(0, 120)}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(doc.updatedAt), {
                  addSuffix: true,
                })}
              </span>
              <button
                onClick={(e) => handleDelete(e, doc.id)}
                disabled={deleting === doc.id}
                className="hidden shrink-0 rounded p-1 text-muted-foreground hover:text-destructive group-hover:block"
                aria-label="Delete document"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
