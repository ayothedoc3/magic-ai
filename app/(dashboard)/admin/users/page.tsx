import { SubscriptionStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatDateTime,
  getCreditsFromJson,
  requireAdminSession,
} from "@/lib/admin";
import { prisma } from "@/lib/prisma";

function subscriptionVariant(status: SubscriptionStatus | null) {
  if (!status) return "secondary" as const;
  if (status === SubscriptionStatus.ACTIVE) return "default" as const;
  if (status === SubscriptionStatus.TRIALING) return "outline" as const;
  return "destructive" as const;
}

export default async function AdminUsersPage() {
  await requireAdminSession();

  const [users, totalUsers, totalAdmins] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        credits: true,
        createdAt: true,
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
            sessions: true,
          },
        },
      },
    }),
    prisma.user.count(),
    prisma.user.count({ where: { role: "ADMIN" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground">
          Latest 100 users with subscription and usage activity.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAdmins.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rows Loaded</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">User Directory</CardTitle>
          <CardDescription>
            This page is read-only for now. Add server actions for role changes
            and credit adjustments next.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-3 pr-4 font-medium">User</th>
                    <th className="py-3 pr-4 font-medium">Role</th>
                    <th className="py-3 pr-4 font-medium">Subscription</th>
                    <th className="py-3 pr-4 font-medium">Usage</th>
                    <th className="py-3 pr-4 font-medium">Credits</th>
                    <th className="py-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const credits = getCreditsFromJson(user.credits);
                    const subscription = user.subscription;
                    return (
                      <tr key={user.id} className="border-b align-top last:border-0">
                        <td className="py-3 pr-4">
                          <div>
                            <p className="font-medium">
                              {user.name ?? "Unnamed user"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {user.email}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge
                            variant={
                              user.role === "ADMIN" ? "default" : "secondary"
                            }
                          >
                            {user.role}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4">
                          {subscription ? (
                            <div className="space-y-1">
                              <Badge variant={subscriptionVariant(subscription.status)}>
                                {subscription.status}
                              </Badge>
                              <p className="text-xs text-muted-foreground">
                                {subscription.plan.name} ({subscription.plan.interval})
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Renews: {formatDateTime(subscription.currentPeriodEnd)}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <Badge variant="secondary">No plan</Badge>
                              <p className="text-xs text-muted-foreground">
                                Free or not subscribed
                              </p>
                            </div>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-xs text-muted-foreground">
                          <p>{user._count.chats} chats</p>
                          <p>{user._count.documents} documents</p>
                          <p>{user._count.generations} generations</p>
                          <p>{user._count.teamMembers} team memberships</p>
                        </td>
                        <td className="py-3 pr-4 text-xs text-muted-foreground">
                          <p>Text: {credits.text.toLocaleString()}</p>
                          <p>Image: {credits.image.toLocaleString()}</p>
                        </td>
                        <td className="py-3 text-xs text-muted-foreground">
                          {formatDateTime(user.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
