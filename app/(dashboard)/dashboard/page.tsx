import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { RecentActivity } from "@/components/dashboard/recent-activity";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { credits: true, name: true },
  });

  const [chatCount, documentCount, generationCount] = await Promise.all([
    prisma.chat.count({ where: { userId: session.user.id } }),
    prisma.document.count({ where: { userId: session.user.id } }),
    prisma.generation.count({ where: { userId: session.user.id } }),
  ]);

  const recentGenerations = await prisma.generation.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Welcome back, {user?.name ?? "there"}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your AI content studio.
        </p>
      </div>
      <StatsCards
        credits={user?.credits as { text: number; image: number }}
        chatCount={chatCount}
        documentCount={documentCount}
        generationCount={generationCount}
      />
      <RecentActivity generations={recentGenerations} />
    </div>
  );
}
