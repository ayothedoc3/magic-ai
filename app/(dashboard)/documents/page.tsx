import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Documents</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Coming in Phase 3
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            View and edit your saved generated content.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
