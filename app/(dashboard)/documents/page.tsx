import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDocuments } from "@/actions/documents";
import { DocumentList } from "@/components/documents/document-list";

type Props = {
  searchParams: { search?: string };
};

export default async function DocumentsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const documents = await getDocuments(searchParams.search);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Documents</h1>
        <p className="text-muted-foreground">
          View and edit your saved content
        </p>
      </div>
      <DocumentList documents={documents} searchQuery={searchParams.search} />
    </div>
  );
}
