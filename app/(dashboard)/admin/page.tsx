import Link from "next/link";
import { ContentType, SubscriptionStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime, requireAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

function MetricCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export default async function AdminOverviewPage() {
  await requireAdminSession();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    userCount,
    adminCount,
    teamCount,
    chatCount,
    documentCount,
    generationCount,
    generationCount7d,
    textGenerationCount,
    imageGenerationCount,
    codeGenerationCount,
    activeSubscriptions,
    trialSubscriptions,
    activePlanCount,
    totalPlanCount,
    activeTemplateCount,
    totalTemplateCount,
    recentUsers,
    recentGenerations,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.team.count(),
    prisma.chat.count(),
    prisma.document.count(),
    prisma.generation.count(),
    prisma.generation.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.generation.count({ where: { type: ContentType.TEXT } }),
    prisma.generation.count({ where: { type: ContentType.IMAGE } }),
    prisma.generation.count({ where: { type: ContentType.CODE } }),
    prisma.subscription.count({
      where: { status: SubscriptionStatus.ACTIVE },
    }),
    prisma.subscription.count({
      where: { status: SubscriptionStatus.TRIALING },
    }),
    prisma.plan.count({ where: { active: true } }),
    prisma.plan.count(),
    prisma.template.count({ where: { active: true } }),
    prisma.template.count(),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    }),
    prisma.generation.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        type: true,
        model: true,
        creditCost: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Overview</h1>
          <p className="text-muted-foreground">
            Operational snapshot for users, usage, plans, and templates.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/analytics"
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            View Analytics
          </Link>
          <Link
            href="/admin/users"
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            Manage Users
          </Link>
          <Link
            href="/admin/plans"
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            Review Plans
          </Link>
          <Link
            href="/admin/settings"
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            Launch Checklist
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Users"
          value={userCount.toLocaleString()}
          description={`${adminCount} admin account(s)`}
        />
        <MetricCard
          title="Subscriptions"
          value={activeSubscriptions.toLocaleString()}
          description={`${trialSubscriptions} trialing`}
        />
        <MetricCard
          title="Generations"
          value={generationCount.toLocaleString()}
          description={`${generationCount7d.toLocaleString()} in last 7 days`}
        />
        <MetricCard
          title="Teams"
          value={teamCount.toLocaleString()}
          description="Enterprise/team workspaces"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Content Activity</CardTitle>
            <CardDescription>Usage totals across all customers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Chats</span>
              <span className="font-medium">{chatCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Documents</span>
              <span className="font-medium">
                {documentCount.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Text generations</span>
              <span className="font-medium">
                {textGenerationCount.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Image generations</span>
              <span className="font-medium">
                {imageGenerationCount.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Code generations</span>
              <span className="font-medium">
                {codeGenerationCount.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Catalog Health</CardTitle>
            <CardDescription>Plans and templates readiness</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Active plans</span>
              <span className="font-medium">
                {activePlanCount} / {totalPlanCount}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Active templates</span>
              <span className="font-medium">
                {activeTemplateCount} / {totalTemplateCount}
              </span>
            </div>
            <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
              Use the Plans and Templates tabs to verify live Stripe IDs and
              production-ready prompts before launch.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Enterprise Readiness</CardTitle>
            <CardDescription>
              Signals for customer + enterprise motion
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Teams created</span>
              <Badge variant={teamCount > 0 ? "default" : "secondary"}>
                {teamCount > 0 ? "Enabled" : "Not used yet"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Admin users</span>
              <Badge variant={adminCount > 0 ? "default" : "destructive"}>
                {adminCount > 0 ? `${adminCount} configured` : "Missing"}
              </Badge>
            </div>
            <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
              Enterprise go-live usually needs SSO/SAML, audit logs, RBAC, and
              usage export APIs. These are not modeled in the current schema yet.
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Users</CardTitle>
            <CardDescription>Latest signups in the platform</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No users found.</p>
            ) : (
              recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {user.name ?? "Unnamed user"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge
                      variant={user.role === "ADMIN" ? "default" : "secondary"}
                    >
                      {user.role}
                    </Badge>
                    <span className="whitespace-nowrap text-muted-foreground">
                      {formatDateTime(user.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Generations</CardTitle>
            <CardDescription>Latest AI outputs across tenants</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentGenerations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No generations found.
              </p>
            ) : (
              recentGenerations.map((generation) => (
                <div
                  key={generation.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {generation.user?.name ??
                        generation.user?.email ??
                        "Unknown user"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {generation.model} · {generation.type}
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{generation.creditCost} credit(s)</p>
                    <p>{formatDateTime(generation.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
