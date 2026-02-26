import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MessageSquare, FileText, Zap, ImageIcon } from "lucide-react";

interface StatsCardsProps {
  credits: { text: number; image: number } | null;
  chatCount: number;
  documentCount: number;
  generationCount: number;
}

export function StatsCards({
  credits,
  chatCount,
  documentCount,
  generationCount,
}: StatsCardsProps) {
  const stats = [
    {
      title: "Text Credits",
      value: credits?.text?.toLocaleString() ?? "0",
      icon: Zap,
      description: "Available text credits",
    },
    {
      title: "Image Credits",
      value: credits?.image?.toLocaleString() ?? "0",
      icon: ImageIcon,
      description: "Available image credits",
    },
    {
      title: "Conversations",
      value: chatCount.toLocaleString(),
      icon: MessageSquare,
      description: "Total chat conversations",
    },
    {
      title: "Documents",
      value: documentCount.toLocaleString(),
      icon: FileText,
      description: "Generated documents",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">
              {stat.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
