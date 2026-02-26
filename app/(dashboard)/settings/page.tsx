import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime, getCreditsFromJson } from "@/lib/admin";

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [user, usageCounts, recentTeams] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        credits: true,
        createdAt: true,
        emailVerified: true,
        activeTeamId: true,
        activeTeam: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
        accounts: {
          select: {
            provider: true,
            type: true,
          },
        },
        subscription: {
          select: {
            status: true,
            currentPeriodEnd: true,
            plan: {
              select: {
                name: true,
                interval: true,
              },
            },
          },
        },
        _count: {
          select: {
            chats: true,
            documents: true,
            generations: true,
            teamMembers: true,
            createdAgents: true,
            requestedAgentRuns: true,
          },
        },
      },
    }),
    Promise.all([
      prisma.generation.count({
        where: {
          userId: session.user.id,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.agentRun.count({
        where: {
          requestedById: session.user.id,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]),
    prisma.teamMember.findMany({
      where: { userId: session.user.id },
      orderBy: { joinedAt: "desc" },
      take: 6,
      select: {
        id: true,
        role: true,
        joinedAt: true,
        team: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
      },
    }),
  ]);

  if (!user) {
    redirect("/login");
  }

  const credits = getCreditsFromJson(user.credits);
  const [generations30d, agentRuns30d] = usageCounts;
  const authProviders = Array.from(
    new Set(
      user.accounts
        .map((account) => account.provider?.trim())
        .filter((provider): provider is string => Boolean(provider))
    )
  );
  const subscription = user.subscription;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Account profile, workspace membership, and usage snapshot.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/settings/billing"
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            Billing
          </Link>
          {user.role === "ADMIN" && (
            <Link
              href="/admin/settings"
              className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
            >
              Admin Settings
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Text Credits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {credits.text.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Current balance</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Image Credits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {credits.image.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Current balance</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Generations (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {generations30d.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              AI outputs in last 30 days
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Agent Runs (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {agentRuns30d.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Requested runs in last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Account</CardTitle>
            <CardDescription>
              Profile and authentication details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Name
                </p>
                <p className="mt-1 font-medium">{user.name ?? "Not set"}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Email
                </p>
                <p className="mt-1 font-medium break-all">{user.email}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Role
                </p>
                <div className="mt-1">
                  <Badge
                    variant={user.role === "ADMIN" ? "default" : "secondary"}
                  >
                    {user.role}
                  </Badge>
                </div>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Email Verification
                </p>
                <div className="mt-1">
                  <Badge variant={user.emailVerified ? "default" : "secondary"}>
                    {user.emailVerified ? "Verified" : "Not verified"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="rounded-md border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Authentication Providers
              </p>
              {authProviders.length === 0 ? (
                <p className="mt-1 text-muted-foreground">
                  Credentials only (no linked OAuth providers detected).
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {authProviders.map((provider) => (
                    <Badge key={provider} variant="outline">
                      {titleCase(provider)}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>Account created: {formatDateTime(user.createdAt)}</span>
              {user.emailVerified ? (
                <span>Verified: {formatDateTime(user.emailVerified)}</span>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Workspace & Plan</CardTitle>
            <CardDescription>
              Active team context and current subscription snapshot
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-md border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Active Team
              </p>
              {user.activeTeam ? (
                <div className="mt-1 space-y-1">
                  <p className="font-medium">{user.activeTeam.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {user.activeTeam.ownerId === user.id
                      ? "You own this team"
                      : "Member workspace"}
                  </p>
                </div>
              ) : (
                <p className="mt-1 text-muted-foreground">
                  No active team selected. You are using a personal workspace.
                </p>
              )}
            </div>

            <div className="rounded-md border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Current Subscription
              </p>
              {subscription ? (
                <div className="mt-2 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        subscription.status === "ACTIVE"
                          ? "default"
                          : subscription.status === "TRIALING"
                            ? "outline"
                            : "secondary"
                      }
                    >
                      {subscription.status}
                    </Badge>
                    <span className="text-sm font-medium">
                      {subscription.plan.name} ({subscription.plan.interval})
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Current period ends {formatDateTime(subscription.currentPeriodEnd)}
                  </p>
                </div>
              ) : (
                <div className="mt-1 space-y-2">
                  <Badge variant="secondary">No paid subscription</Badge>
                  <p className="text-xs text-muted-foreground">
                    You are currently on the free tier or billing has not been set
                    up yet.
                  </p>
                </div>
              )}
              <div className="mt-3">
                <Link
                  href="/settings/billing"
                  className="text-xs text-primary hover:underline"
                >
                  Open billing details
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Workspaces
                </p>
                <p className="mt-1 font-medium">
                  {user._count.teamMembers.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Memberships</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Agents
                </p>
                <p className="mt-1 font-medium">
                  {user._count.createdAgents.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Created by you</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Workspace Memberships</CardTitle>
          <CardDescription>
            Recent teams you belong to (read-only for now)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentTeams.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You are not a member of any team workspaces yet.
            </p>
          ) : (
            <div className="space-y-3">
              {recentTeams.map((membership) => (
                <div
                  key={membership.id}
                  className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {membership.team.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Joined {formatDateTime(membership.joinedAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{membership.role}</Badge>
                    {membership.team.id === user.activeTeamId && (
                      <Badge variant="default">Active</Badge>
                    )}
                    {membership.team.ownerId === user.id && (
                      <Badge variant="secondary">Owner</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Usage Snapshot</CardTitle>
          <CardDescription>
            Quick overview of activity totals on your account
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <div className="rounded-md border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Chats
            </p>
            <p className="mt-1 font-medium">{user._count.chats.toLocaleString()}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Documents
            </p>
            <p className="mt-1 font-medium">
              {user._count.documents.toLocaleString()}
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Generations
            </p>
            <p className="mt-1 font-medium">
              {user._count.generations.toLocaleString()}
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Agent Runs
            </p>
            <p className="mt-1 font-medium">
              {user._count.requestedAgentRuns.toLocaleString()}
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Linked Providers
            </p>
            <p className="mt-1 font-medium">{authProviders.length || 1}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Current Plan
            </p>
            <p className="mt-1 font-medium">
              {subscription?.plan.name ?? "Free / None"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

