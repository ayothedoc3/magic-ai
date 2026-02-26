import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { getAgentQueueStats } from "@/lib/agent-queue";
import { auth } from "@/lib/auth";
import { formatDateTime } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import {
  createAgentAction,
  createAgentScheduleAction,
  dispatchAgentSchedulesAction,
  processAgentQueueAction,
  runAgentAction,
  toggleAgentScheduleEnabledAction,
  toggleAgentEnabledAction,
} from "@/actions/agents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { redirect } from "next/navigation";

function statusVariant(status: string) {
  switch (status) {
    case "COMPLETED":
      return "default" as const;
    case "RUNNING":
      return "outline" as const;
    case "FAILED":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}

type AgentsPageProps = {
  searchParams?: {
    created?: string;
    updated?: string;
    scheduledCreated?: string;
    scheduleUpdated?: string;
    scheduledDispatch?: string;
    processed?: string;
    failed?: string;
    requeued?: string;
    recovered?: string;
    error?: string;
  };
};

export default async function AgentsPage({ searchParams }: AgentsPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const viewer = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      activeTeamId: true,
    },
  });

  if (!viewer) {
    redirect("/login");
  }

  const agentScope: Prisma.AgentWhereInput = viewer.activeTeamId
    ? {
        OR: [{ createdById: viewer.id }, { teamId: viewer.activeTeamId }],
      }
    : { createdById: viewer.id };

  const recentRunScope: Prisma.AgentRunWhereInput = viewer.activeTeamId
    ? {
        OR: [
          { requestedById: viewer.id },
          { agent: { createdById: viewer.id } },
          { teamId: viewer.activeTeamId },
          { agent: { teamId: viewer.activeTeamId } },
        ],
      }
    : {
        OR: [{ requestedById: viewer.id }, { agent: { createdById: viewer.id } }],
      };

  const [templates, agents, recentRuns, queueStats] = await Promise.all([
    prisma.template.findMany({
      where: { active: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        category: true,
      },
    }),
    prisma.agent.findMany({
      where: agentScope,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        goal: true,
        enabled: true,
        defaultModel: true,
        maxSteps: true,
        maxCredits: true,
        teamId: true,
        updatedAt: true,
        template: {
          select: {
            id: true,
            name: true,
            slug: true,
            category: true,
          },
        },
        _count: {
          select: {
            runs: true,
            schedules: true,
          },
        },
        schedules: {
          orderBy: [{ nextRunAt: "asc" }, { createdAt: "asc" }],
          take: 3,
          select: {
            id: true,
            name: true,
            enabled: true,
            intervalMinutes: true,
            nextRunAt: true,
            lastDispatchedAt: true,
          },
        },
        runs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.agentRun.findMany({
      where: recentRunScope,
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        status: true,
        summary: true,
        error: true,
        creditUsed: true,
        stepCount: true,
        createdAt: true,
        completedAt: true,
        agent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        requestedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
    getAgentQueueStats(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Agents</h1>
        <p className="text-muted-foreground">
          Create scoped agents and queue auditable, multi-step executions.
        </p>
      </div>

      {(searchParams?.created ||
        searchParams?.updated ||
        searchParams?.scheduledCreated ||
        searchParams?.scheduleUpdated ||
        searchParams?.scheduledDispatch ||
        searchParams?.processed ||
        searchParams?.error) && (
        <Card>
          <CardContent className="pt-6 text-sm">
            {searchParams.error ? (
              <p className="text-destructive">{decodeURIComponent(searchParams.error)}</p>
            ) : searchParams.created ? (
              <p className="text-muted-foreground">Agent created.</p>
            ) : searchParams.scheduledCreated ? (
              <p className="text-muted-foreground">Schedule created.</p>
            ) : searchParams.scheduleUpdated ? (
              <p className="text-muted-foreground">Schedule updated.</p>
            ) : searchParams.scheduledDispatch ? (
              <p className="text-muted-foreground">
                Dispatched {searchParams.scheduledDispatch} due schedule(s) into the queue.
              </p>
            ) : searchParams.processed ? (
              <p className="text-muted-foreground">
                Processed {searchParams.processed} queued run(s)
                {searchParams.failed ? `, ${searchParams.failed} failed` : ""}
                {searchParams.requeued ? `, ${searchParams.requeued} requeued` : ""}
                {searchParams.recovered
                  ? `, ${searchParams.recovered} stale run(s) recovered`
                  : ""}
                .
              </p>
            ) : (
              <p className="text-muted-foreground">Agent updated.</p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Queued Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{queueStats.queued}</div>
            <p className="text-xs text-muted-foreground">
              {queueStats.readyQueued} ready · {queueStats.delayedQueued} waiting
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Running</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{queueStats.running}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{queueStats.failed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Worker Mode</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Start `npx tsx scripts/agent-worker.ts` to process queued runs continuously.
            </p>
            {viewer.role === "ADMIN" && (
              <div className="flex flex-wrap items-center gap-2">
                <form action={dispatchAgentSchedulesAction}>
                  <input type="hidden" name="limit" value="10" />
                  <Button type="submit" variant="outline" size="sm">
                    Dispatch Schedules
                  </Button>
                </form>
                <form action={processAgentQueueAction}>
                  <input type="hidden" name="limit" value="3" />
                  <Button type="submit" variant="outline" size="sm">
                    Process 3 Now
                  </Button>
                </form>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Create Agent</CardTitle>
            <CardDescription>
              Queue-backed agent scaffold with step traces and optional OpenAI execution.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createAgentAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required placeholder="Content Ops Agent" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  placeholder="Drafts structured content from business objectives"
                  maxLength={240}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="goal">Goal</Label>
                <textarea
                  id="goal"
                  name="goal"
                  required
                  rows={4}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Turn a business brief into a usable first draft document with clear structure and next actions."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="systemPrompt">System Prompt (optional)</Label>
                <textarea
                  id="systemPrompt"
                  name="systemPrompt"
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="You are a reliable content operations agent. Be structured, concise, and explicit about assumptions."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="templateId">Preferred Template (optional)</Label>
                <select
                  id="templateId"
                  name="templateId"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  defaultValue=""
                >
                  <option value="">Auto-select template</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} ({template.category})
                    </option>
                  ))}
                </select>
              </div>

              {viewer.activeTeamId && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="useActiveTeam"
                    className="h-4 w-4 rounded border-input"
                  />
                  Scope this agent to your active team
                </label>
              )}

              <Button type="submit" className="w-full">
                Create Agent
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Agent Catalog</CardTitle>
            <CardDescription>
              Runs are queued. A worker (or manual admin queue processor) executes them.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {agents.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                No agents yet. Create your first agent to start collecting runs and step traces.
              </div>
            ) : (
              agents.map((agent) => {
                const lastRun = agent.runs[0];
                return (
                  <div key={agent.id} className="rounded-lg border p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold">{agent.name}</h3>
                          <Badge variant={agent.enabled ? "default" : "secondary"}>
                            {agent.enabled ? "Enabled" : "Disabled"}
                          </Badge>
                          {agent.teamId && <Badge variant="outline">Team-scoped</Badge>}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {agent.description ?? "No description"}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>Slug: {agent.slug}</span>
                          <span>Model: {agent.defaultModel}</span>
                          <span>Max steps: {agent.maxSteps}</span>
                          <span>Budget: {agent.maxCredits} credits</span>
                          <span>Runs: {agent._count.runs}</span>
                          <span>Schedules: {agent._count.schedules}</span>
                          <span>Updated: {formatDateTime(agent.updatedAt)}</span>
                        </div>
                        {agent.template && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Template: {agent.template.name} ({agent.template.category})
                          </p>
                        )}
                        {lastRun && (
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                            <Badge variant={statusVariant(lastRun.status)}>
                              Last run: {lastRun.status}
                            </Badge>
                            <Link
                              href={`/agents/runs/${lastRun.id}`}
                              className="text-primary hover:underline"
                            >
                              View run
                            </Link>
                            <span className="text-muted-foreground">
                              {formatDateTime(lastRun.createdAt)}
                            </span>
                          </div>
                        )}
                        <div className="mt-3 rounded-md border p-3">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              Schedules
                            </p>
                            <span className="text-xs text-muted-foreground">
                              Interval scheduler
                            </span>
                          </div>

                          {agent.schedules.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                              No schedules yet.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {agent.schedules.map((schedule) => (
                                <div
                                  key={schedule.id}
                                  className="rounded-md border p-2 text-xs"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                      <p className="font-medium">{schedule.name}</p>
                                      <p className="text-muted-foreground">
                                        Every {schedule.intervalMinutes} min · Next{" "}
                                        {formatDateTime(schedule.nextRunAt)}
                                      </p>
                                      <p className="text-muted-foreground">
                                        Last dispatch:{" "}
                                        {formatDateTime(schedule.lastDispatchedAt)}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge
                                        variant={
                                          schedule.enabled ? "default" : "secondary"
                                        }
                                      >
                                        {schedule.enabled ? "Enabled" : "Disabled"}
                                      </Badge>
                                      <form action={toggleAgentScheduleEnabledAction}>
                                        <input
                                          type="hidden"
                                          name="scheduleId"
                                          value={schedule.id}
                                        />
                                        <input
                                          type="hidden"
                                          name="enabled"
                                          value={schedule.enabled ? "false" : "true"}
                                        />
                                        <Button type="submit" variant="outline" size="sm">
                                          {schedule.enabled ? "Disable" : "Enable"}
                                        </Button>
                                      </form>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {agent._count.schedules > agent.schedules.length && (
                                <p className="text-xs text-muted-foreground">
                                  Showing {agent.schedules.length} of {agent._count.schedules} schedules.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <form action={toggleAgentEnabledAction}>
                          <input type="hidden" name="agentId" value={agent.id} />
                          <input
                            type="hidden"
                            name="enabled"
                            value={agent.enabled ? "false" : "true"}
                          />
                          <Button type="submit" variant="outline" size="sm">
                            {agent.enabled ? "Disable" : "Enable"}
                          </Button>
                        </form>
                      </div>
                    </div>

                    <form action={runAgentAction} className="mt-4 space-y-3">
                      <input type="hidden" name="agentId" value={agent.id} />
                      <div className="space-y-2">
                        <Label htmlFor={`objective-${agent.id}`}>Run Objective</Label>
                        <textarea
                          id={`objective-${agent.id}`}
                          name="objective"
                          required
                          rows={3}
                          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          placeholder="Create a first draft blog outline and article brief for our new product launch."
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground">
                          Queues a run for the worker. Uses OpenAI when configured, with deterministic fallback.
                        </p>
                        <Button type="submit" disabled={!agent.enabled}>
                          Queue Run
                        </Button>
                      </div>
                    </form>

                    <form
                      action={createAgentScheduleAction}
                      className="mt-4 space-y-3 rounded-md border border-dashed p-3"
                    >
                      <input type="hidden" name="agentId" value={agent.id} />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium">Create Schedule</p>
                        <p className="text-xs text-muted-foreground">
                          Enqueues scheduled runs (requires worker/cron)
                        </p>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`schedule-name-${agent.id}`}>Name</Label>
                          <Input
                            id={`schedule-name-${agent.id}`}
                            name="name"
                            required
                            maxLength={80}
                            placeholder="Morning content brief"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`schedule-interval-${agent.id}`}>
                            Interval (minutes)
                          </Label>
                          <Input
                            id={`schedule-interval-${agent.id}`}
                            name="intervalMinutes"
                            type="number"
                            min={1}
                            max={43200}
                            defaultValue={60}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`schedule-objective-${agent.id}`}>
                          Objective Template
                        </Label>
                        <textarea
                          id={`schedule-objective-${agent.id}`}
                          name="objectiveTemplate"
                          required
                          rows={3}
                          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          placeholder="Create a daily performance summary for {{date}} and propose next actions. Agent={{agent_name}}. Timestamp={{now_iso}}"
                        />
                        <p className="text-xs text-muted-foreground">
                          Supports placeholders: {"{{agent_name}}"}, {"{{date}}"}, {"{{time_utc}}"}, {"{{now_iso}}"}
                        </p>
                      </div>

                      <div className="flex justify-end">
                        <Button type="submit" variant="outline" disabled={!agent.enabled}>
                          Add Schedule
                        </Button>
                      </div>
                    </form>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Runs</CardTitle>
          <CardDescription>
            Execution history with status, cost, and step counts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentRuns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No agent runs yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-3 pr-4 font-medium">Run</th>
                    <th className="py-3 pr-4 font-medium">Status</th>
                    <th className="py-3 pr-4 font-medium">Requested By</th>
                    <th className="py-3 pr-4 font-medium">Summary</th>
                    <th className="py-3 pr-4 font-medium">Usage</th>
                    <th className="py-3 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRuns.map((run) => (
                    <tr key={run.id} className="border-b align-top last:border-0">
                      <td className="py-3 pr-4">
                        <div>
                          <Link
                            href={`/agents/runs/${run.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {run.agent.name}
                          </Link>
                          <p className="text-xs text-muted-foreground">{run.id}</p>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={statusVariant(run.status)}>{run.status}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">
                        {run.requestedBy?.name ?? run.requestedBy?.email ?? "System"}
                      </td>
                      <td className="py-3 pr-4">
                        <p className="max-w-md text-sm">
                          {run.summary ?? run.error ?? "No summary yet"}
                        </p>
                      </td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">
                        <p>{run.stepCount} step(s)</p>
                        <p>{run.creditUsed} credit(s)</p>
                      </td>
                      <td className="py-3 text-xs text-muted-foreground">
                        <p>Created: {formatDateTime(run.createdAt)}</p>
                        <p>Done: {formatDateTime(run.completedAt)}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
