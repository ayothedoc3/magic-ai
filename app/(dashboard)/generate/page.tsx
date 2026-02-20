import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wand2 } from "lucide-react";

export default function GeneratePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Generate Content</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Coming in Phase 3
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Template-based content generation with streaming output.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
