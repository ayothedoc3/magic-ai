import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, FileText, Image, Code } from "lucide-react";
import type { Generation } from "@prisma/client";

const typeIcons: Record<string, React.ElementType> = {
  CHAT: MessageSquare,
  TEXT: FileText,
  IMAGE: Image,
  CODE: Code,
};

interface RecentActivityProps {
  generations: Generation[];
}

export function RecentActivity({ generations }: RecentActivityProps) {
  if (generations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No activity yet. Start a chat or generate some content!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {generations.map((gen) => {
            const Icon = typeIcons[gen.type] || FileText;
            return (
              <div
                key={gen.id}
                className="flex items-center gap-4 rounded-lg border p-3"
              >
                <div className="rounded-md bg-muted p-2">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {gen.input
                      ? gen.input.slice(0, 60) +
                        (gen.input.length > 60 ? "..." : "")
                      : "Generation"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {gen.model} &middot;{" "}
                    {new Date(gen.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="secondary">{gen.type.toLowerCase()}</Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
