import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export default function ChatPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">AI Chat</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Coming in Phase 2
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Multi-provider streaming chat with GPT-4o, Claude, and Gemini.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
