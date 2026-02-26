import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getDocumentById } from "@/actions/documents";
import { DocumentEditor } from "@/components/documents/document-editor";

type Props = {
  params: { documentId: string };
};

export default async function DocumentEditorPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const document = await getDocumentById(params.documentId);
  if (!document) notFound();

  return (
    <div className="space-y-4">
      <Link
        href="/documents"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Documents
      </Link>
      <DocumentEditor
        documentId={document.id}
        initialTitle={document.title}
        initialContent={document.content || ""}
      />
    </div>
  );
}
