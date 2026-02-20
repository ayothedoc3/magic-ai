import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageIcon } from "lucide-react";

export default function ImagesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Image Generation</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Coming in Phase 4
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Generate images with DALL-E 3 and view in gallery.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
