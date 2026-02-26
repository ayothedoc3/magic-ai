import Link from "next/link";
import { GeneratedPageType, type Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { formatDateTime } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { PseoShareExamplePanel } from "@/components/pseo/pseo-share-example-panel";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

function prettyJson(value: Prisma.JsonValue | null | undefined) {
  if (value == null) return "null";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function getOutputArtifactIds(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { documentId: null as string | null, generationId: null as string | null };
  }

  const record = value as Record<string, unknown>;
  const artifact =
    record.artifact && typeof record.artifact === "object" && !Array.isArray(record.artifact)
      ? (record.artifact as Record<string, unknown>)
      : null;

  return {
    documentId: artifact && typeof artifact.documentId === "string" ? artifact.documentId : null,
    generationId:
      artifact && typeof artifact.generationId === "string" ? artifact.generationId : null,
  };
}

function getRunObjectiveText(
  input: Prisma.JsonValue | null | undefined,
  output: Prisma.JsonValue | null | undefined
) {
  const outputRecord =
    output && typeof output === "object" && !Array.isArray(output)
      ? (output as Record<string, unknown>)
      : null;
  if (outputRecord && typeof outputRecord.objective === "string") {
    const objective = outputRecord.objective.trim();
    if (objective) return objective;
  }

  const inputRecord =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : null;
  if (inputRecord && typeof inputRecord.objective === "string") {
    const objective = inputRecord.objective.trim();
    if (objective) return objective;
  }

  return prettyJson(input);
}

function getSelectedTemplateSnapshot(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null as null | {
      id: string;
      name: string;
      slug: string | null;
      category: string | null;
    };
  }

  const record = value as Record<string, unknown>;
  const selectedTemplate =
    record.selectedTemplate &&
    typeof record.selectedTemplate === "object" &&
    !Array.isArray(record.selectedTemplate)
      ? (record.selectedTemplate as Record<string, unknown>)
      : null;

  if (!selectedTemplate || typeof selectedTemplate.id !== "string") {
    return null;
  }

  return {
    id: selectedTemplate.id,
    name:
      typeof selectedTemplate.name === "string"
        ? selectedTemplate.name
        : "Template",
    slug:
      typeof selectedTemplate.slug === "string" ? selectedTemplate.slug : null,
    category:
      typeof selectedTemplate.category === "string"
        ? selectedTemplate.category
        : null,
  };
}

export default async function AgentRunDetailPage({
  params,
}: {
  params: { runId: string };
}) {
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

  const run = await prisma.agentRun.findUnique({
    where: { id: params.runId },
    include: {
      agent: {
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          goal: true,
          enabled: true,
          teamId: true,
          createdById: true,
          template: {
            select: {
              id: true,
              name: true,
              slug: true,
              category: true,
            },
          },
        },
      },
      requestedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      steps: {
        orderBy: [{ attemptNumber: "asc" }, { stepNumber: "asc" }],
      },
    },
  });

  if (!run) {
    redirect("/agents");
  }

  const hasAccess =
    viewer.role === "ADMIN" ||
    run.requestedById === viewer.id ||
    run.agent.createdById === viewer.id ||
    (Boolean(viewer.activeTeamId) &&
      (run.teamId === viewer.activeTeamId || run.agent.teamId === viewer.activeTeamId));

  if (!hasAccess) {
    redirect("/agents");
  }

  const artifactIds = getOutputArtifactIds(run.output);
  const selectedTemplateSnapshot = getSelectedTemplateSnapshot(run.output);
  const [artifactDocument, artifactGeneration] = await Promise.all([
    artifactIds.documentId
      ? prisma.document.findUnique({
          where: { id: artifactIds.documentId },
          select: {
            id: true,
            title: true,
            content: true,
            template: {
              select: {
                id: true,
                name: true,
                slug: true,
                category: true,
              },
            },
          },
        })
      : Promise.resolve(null),
    artifactIds.generationId
      ? prisma.generation.findUnique({
          where: { id: artifactIds.generationId },
          select: {
            id: true,
            input: true,
            output: true,
            type: true,
            model: true,
          },
        })
      : Promise.resolve(null),
  ]);
  const shareTemplate = artifactDocument?.template ?? selectedTemplateSnapshot;
  const shareOutputText =
    artifactDocument?.content?.trim() || artifactGeneration?.output?.trim() || null;
  const shareInputText =
    artifactGeneration?.input?.trim() || getRunObjectiveText(run.input, run.output);
  const canShareAsPseoExample =
    Boolean(shareTemplate?.id) && Boolean(shareOutputText);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{run.agent.name}</h1>
            <Badge variant={statusVariant(run.status)}>{run.status}</Badge>
          </div>
          <p className="text-muted-foreground">
            Run ID: {run.id} - Trigger: {run.triggerType}
          </p>
        </div>
        <Link href="/agents" className="text-sm text-primary hover:underline">
          Back to agents
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Run Summary</CardTitle>
            <CardDescription>Execution metadata</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Requested by:</span>{" "}
              {run.requestedBy?.name ?? run.requestedBy?.email ?? "System"}
            </p>
            <p>
              <span className="text-muted-foreground">Created:</span>{" "}
              {formatDateTime(run.createdAt)}
            </p>
            <p>
              <span className="text-muted-foreground">Started:</span>{" "}
              {formatDateTime(run.startedAt)}
            </p>
            <p>
              <span className="text-muted-foreground">Completed:</span>{" "}
              {formatDateTime(run.completedAt)}
            </p>
            <p>
              <span className="text-muted-foreground">Steps:</span> {run.stepCount}
            </p>
            <p>
              <span className="text-muted-foreground">Attempt:</span>{" "}
              {run.attemptCount}/{run.maxAttempts}
            </p>
            <p>
              <span className="text-muted-foreground">Credits used:</span>{" "}
              {run.creditUsed}
            </p>
            <p>
              <span className="text-muted-foreground">Worker:</span>{" "}
              {run.workerId ?? "N/A"}
            </p>
            <p>
              <span className="text-muted-foreground">Last heartbeat:</span>{" "}
              {formatDateTime(run.lastHeartbeatAt)}
            </p>
            <p>
              <span className="text-muted-foreground">Next retry:</span>{" "}
              {formatDateTime(run.nextRetryAt)}
            </p>
            {run.summary && (
              <div className="rounded-md border p-3 text-sm">{run.summary}</div>
            )}
            {run.error && (
              <div className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">
                {run.error}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Agent Config</CardTitle>
            <CardDescription>Snapshot at execution time (current values shown)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Slug:</span> {run.agent.slug}
            </p>
            <p>
              <span className="text-muted-foreground">Enabled:</span>{" "}
              {run.agent.enabled ? "Yes" : "No"}
            </p>
            <p>
              <span className="text-muted-foreground">Scope:</span>{" "}
              {run.agent.teamId ? "Team" : "Personal"}
            </p>
            <p className="text-muted-foreground">
              {run.agent.description ?? "No description"}
            </p>
            {run.agent.goal && (
              <div className="rounded-md border p-3">
                <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                  Goal
                </p>
                <p className="whitespace-pre-wrap text-sm">{run.agent.goal}</p>
              </div>
            )}
            {run.agent.template && (
              <p className="text-xs text-muted-foreground">
                Template: {run.agent.template.name} ({run.agent.template.category})
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Artifacts</CardTitle>
            <CardDescription>Persisted output references</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Document ID:</span>{" "}
              {artifactIds.documentId ?? "None"}
            </p>
            <p>
              <span className="text-muted-foreground">Generation ID:</span>{" "}
              {artifactIds.generationId ?? "None"}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link href="/documents" className="text-primary hover:underline">
                Go to Documents
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Run Input / Output</CardTitle>
          <CardDescription>Raw JSON captured for auditability</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
              Input
            </p>
            <pre className="max-h-96 overflow-auto rounded-md border bg-muted/30 p-3 text-xs">
{prettyJson(run.input)}
            </pre>
          </div>
          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
              Output
            </p>
            <pre className="max-h-96 overflow-auto rounded-md border bg-muted/30 p-3 text-xs">
{prettyJson(run.output)}
            </pre>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Share Run Output as pSEO Example</CardTitle>
          <CardDescription>
            Publish this real generated draft as a reusable example page for long-tail SEO.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {canShareAsPseoExample && shareTemplate && shareOutputText ? (
            <PseoShareExamplePanel
              templateId={shareTemplate.id}
              templateName={shareTemplate.name}
              sourceSlug={`agent-run-${run.id}`}
              currentPageType={GeneratedPageType.GENERATED_EXAMPLE}
              analyticsSource="agent_run"
              sampleInputText={shareInputText}
              sampleOutputText={shareOutputText}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Sharing is available when the run has a persisted text artifact linked to a
              template. Template detected: {shareTemplate ? "Yes" : "No"} | Output detected:{" "}
              {shareOutputText ? "Yes" : "No"}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Step Trace</CardTitle>
          <CardDescription>
            Each step is persisted separately to support debugging and future approval flows.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {run.steps.length === 0 ? (
            <p className="text-sm text-muted-foreground">No steps recorded.</p>
          ) : (
            run.steps.map((step) => (
              <div key={step.id} className="rounded-lg border p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">
                        {step.stepNumber}. {step.name}
                      </h3>
                      <Badge variant="secondary">Attempt {step.attemptNumber}</Badge>
                      <Badge variant="outline">{step.type}</Badge>
                      <Badge variant={statusVariant(step.status)}>{step.status}</Badge>
                    </div>
                    {step.rationale && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {step.rationale}
                      </p>
                    )}
                    {step.toolName && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Tool: {step.toolName}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <p>Started: {formatDateTime(step.startedAt)}</p>
                    <p>Done: {formatDateTime(step.completedAt)}</p>
                  </div>
                </div>

                {step.error && (
                  <div className="mt-3 rounded-md border border-destructive/40 p-3 text-sm text-destructive">
                    {step.error}
                  </div>
                )}

                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                      Step Input
                    </p>
                    <pre className="max-h-64 overflow-auto rounded-md border bg-muted/30 p-3 text-xs">
{prettyJson(step.input)}
                    </pre>
                  </div>
                  <div>
                    <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                      Step Output
                    </p>
                    <pre className="max-h-64 overflow-auto rounded-md border bg-muted/30 p-3 text-xs">
{prettyJson(step.output)}
                    </pre>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
