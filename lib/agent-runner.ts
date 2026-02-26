import {
  AgentRunStatus,
  AgentStepStatus,
  AgentStepType,
  ContentType,
  type Prisma,
} from "@prisma/client";
import { trackGa4ServerEvent } from "@/lib/analytics.server";
import { callOpenAIChatCompletion, hasOpenAIKey } from "@/lib/openai";
import { prisma } from "@/lib/prisma";

type RunInputObject = {
  objective: string;
};

function getRunInputObject(value: Prisma.JsonValue | null | undefined): RunInputObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { objective: "" };
  }

  const record = value as Record<string, unknown>;
  return {
    objective: typeof record.objective === "string" ? record.objective : "",
  };
}

function normalizeObjective(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 2000);
}

function buildExecutionPlan(objective: string, maxSteps: number) {
  const plan = [
    "Clarify the objective and desired deliverable.",
    "Select the best available prompt template for the task.",
    "Produce a first draft output and store it for review.",
  ];

  if (/seo|blog|article|content/i.test(objective)) {
    plan.splice(2, 0, "Structure the draft for readability and reuse.");
  }

  if (/email|outreach|campaign/i.test(objective)) {
    plan.splice(2, 0, "Tune the tone and CTA for conversion intent.");
  }

  return plan.slice(0, Math.max(1, maxSteps));
}

function inferTemplateCategories(objective: string) {
  const lower = objective.toLowerCase();
  const categories: string[] = [];

  if (lower.includes("blog") || lower.includes("article") || lower.includes("seo")) {
    categories.push("blog");
  }
  if (lower.includes("email") || lower.includes("newsletter")) {
    categories.push("email");
  }
  if (lower.includes("social") || lower.includes("linkedin") || lower.includes("twitter")) {
    categories.push("social");
  }
  if (lower.includes("product")) {
    categories.push("marketing");
  }
  if (lower.includes("code") || lower.includes("script") || lower.includes("function")) {
    categories.push("code");
  }

  return categories;
}

function buildDraftContent(params: {
  agentName: string;
  goal?: string | null;
  objective: string;
  systemPrompt?: string | null;
  selectedTemplate?: {
    name: string;
    slug: string;
    category: string;
    prompt: string;
  } | null;
  plan: string[];
}) {
  const { agentName, goal, objective, systemPrompt, selectedTemplate, plan } = params;
  const templatePromptPreview = selectedTemplate?.prompt
    ? selectedTemplate.prompt.slice(0, 280)
    : null;

  const lines = [
    `# ${agentName} Draft Output`,
    "",
    "## Objective",
    objective,
    "",
    "## Agent Goal",
    goal?.trim() || "No explicit goal configured.",
    "",
    "## Execution Plan",
    ...plan.map((step, index) => `${index + 1}. ${step}`),
    "",
    "## Selected Template",
    selectedTemplate
      ? `${selectedTemplate.name} (\`${selectedTemplate.slug}\`) · category: ${selectedTemplate.category}`
      : "No template selected (fallback mode).",
    "",
    "## Draft",
    "This is a scaffolded agent draft. Replace this deterministic output with an LLM/tool execution step in the next iteration.",
    "",
    `Requested work: ${objective}`,
    "",
    "Suggested next actions:",
    "1. Review the draft and refine the deliverable format.",
    "2. Connect a real provider/tool runtime in the agent runner.",
    "3. Add approval gates for write/send actions.",
  ];

  if (systemPrompt?.trim()) {
    lines.push("", "## System Prompt (Configured)", systemPrompt.trim());
  }

  if (templatePromptPreview) {
    lines.push(
      "",
      "## Template Prompt Preview",
      templatePromptPreview + (selectedTemplate!.prompt.length > 280 ? "..." : "")
    );
  }

  return lines.join("\n");
}

function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function extractJsonObject(text: string) {
  const trimmed = text.trim();
  const direct = tryParseJson(trimmed);
  if (direct && typeof direct === "object" && !Array.isArray(direct)) {
    return direct as Record<string, unknown>;
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const candidate = trimmed.slice(firstBrace, lastBrace + 1);
    const parsed = tryParseJson(candidate);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  }

  return null;
}

async function buildPlanStepOutput(params: {
  objective: string;
  maxSteps: number;
  model: string;
  agentName: string;
  goal?: string | null;
}) {
  const fallbackPlan = buildExecutionPlan(params.objective, params.maxSteps);

  if (!hasOpenAIKey()) {
    return {
      objective: params.objective,
      plan: fallbackPlan,
      plannedStepCount: fallbackPlan.length,
      source: "heuristic",
      llm: { used: false, reason: "OPENAI_API_KEY missing" },
    } satisfies Prisma.InputJsonObject;
  }

  try {
    const result = await callOpenAIChatCompletion({
      model: params.model,
      temperature: 0.1,
      maxTokens: 500,
      messages: [
        {
          role: "system",
          content:
            "You are an execution planner for an AI agent. Return ONLY valid JSON in this shape: {\"plan\": [\"step 1\", \"step 2\"]}.",
        },
        {
          role: "user",
          content: [
            `Agent: ${params.agentName}`,
            `Goal: ${params.goal?.trim() || "No explicit goal"}`,
            `Objective: ${params.objective}`,
            `Max steps: ${params.maxSteps}`,
            "Generate a bounded execution plan.",
          ].join("\n"),
        },
      ],
    });

    const parsed = extractJsonObject(result.text);
    const planCandidate = parsed?.plan;
    const plan =
      Array.isArray(planCandidate) &&
      planCandidate.every((item: unknown) => typeof item === "string")
        ? (planCandidate as string[]).map((item) => item.trim()).filter(Boolean)
        : [];

    if (plan.length === 0) {
      return {
        objective: params.objective,
        plan: fallbackPlan,
        plannedStepCount: fallbackPlan.length,
        source: "heuristic",
        llm: {
          used: true,
          model: result.model,
          parseError: "Invalid JSON plan",
          raw: result.text.slice(0, 500),
          usage: result.usage,
        },
      } satisfies Prisma.InputJsonObject;
    }

    const boundedPlan = plan.slice(0, Math.max(1, params.maxSteps));

    return {
      objective: params.objective,
      plan: boundedPlan,
      plannedStepCount: boundedPlan.length,
      source: "openai",
      llm: {
        used: true,
        model: result.model,
        usage: result.usage,
      },
    } satisfies Prisma.InputJsonObject;
  } catch (error) {
    return {
      objective: params.objective,
      plan: fallbackPlan,
      plannedStepCount: fallbackPlan.length,
      source: "heuristic",
      llm: {
        used: true,
        error: error instanceof Error ? error.message : "OpenAI plan error",
      },
    } satisfies Prisma.InputJsonObject;
  }
}

async function buildDraftStepOutput(params: {
  agentName: string;
  goal?: string | null;
  objective: string;
  systemPrompt?: string | null;
  selectedTemplate?: {
    id: string;
    name: string;
    slug: string;
    category: string;
    prompt: string;
  } | null;
  plan: string[];
  model: string;
}) {
  const fallbackDraft = buildDraftContent(params);

  if (!hasOpenAIKey()) {
    return {
      draft: fallbackDraft,
      source: "heuristic",
      model: params.model,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      fallbackReason: "OPENAI_API_KEY missing",
    };
  }

  try {
    const templateBlock = params.selectedTemplate
      ? [
          `Template Name: ${params.selectedTemplate.name}`,
          `Template Slug: ${params.selectedTemplate.slug}`,
          `Template Category: ${params.selectedTemplate.category}`,
          `Template Prompt: ${params.selectedTemplate.prompt}`,
        ].join("\n")
      : "No template selected.";

    const result = await callOpenAIChatCompletion({
      model: params.model,
      temperature: 0.4,
      maxTokens: 1400,
      messages: [
        {
          role: "system",
          content:
            (params.systemPrompt?.trim() ||
              "You are a reliable operations agent that produces structured, actionable drafts.") +
            "\nReturn Markdown only.",
        },
        {
          role: "user",
          content: [
            `Agent: ${params.agentName}`,
            `Goal: ${params.goal?.trim() || "No explicit goal"}`,
            `Objective: ${params.objective}`,
            "",
            "Execution Plan:",
            ...params.plan.map((step, index) => `${index + 1}. ${step}`),
            "",
            "Template Context:",
            templateBlock,
            "",
            "Produce a high-quality first draft with clear headings, assumptions, and next actions.",
          ].join("\n"),
        },
      ],
    });

    return {
      draft: result.text,
      source: "openai",
      model: result.model,
      usage: result.usage,
    };
  } catch (error) {
    return {
      draft: fallbackDraft,
      source: "heuristic",
      model: params.model,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      fallbackReason: error instanceof Error ? error.message : "OpenAI draft error",
    };
  }
}

async function runStep<T extends Prisma.InputJsonValue>(params: {
  runId: string;
  attemptNumber: number;
  stepNumber: number;
  type: AgentStepType;
  name: string;
  rationale?: string;
  toolName?: string;
  input?: Prisma.InputJsonValue;
  execute: () => Promise<T>;
}) {
  const step = await prisma.agentStep.create({
    data: {
      runId: params.runId,
      attemptNumber: params.attemptNumber,
      stepNumber: params.stepNumber,
      type: params.type,
      status: AgentStepStatus.RUNNING,
      name: params.name,
      rationale: params.rationale,
      toolName: params.toolName,
      input: params.input,
      startedAt: new Date(),
    },
  });
  await touchRunHeartbeat(params.runId);

  try {
    const output = await params.execute();

    await prisma.agentStep.update({
      where: { id: step.id },
      data: {
        status: AgentStepStatus.COMPLETED,
        output,
        completedAt: new Date(),
      },
    });
    await touchRunHeartbeat(params.runId);

    return output;
  } catch (error) {
    await prisma.agentStep.update({
      where: { id: step.id },
      data: {
        status: AgentStepStatus.FAILED,
        error: error instanceof Error ? error.message : "Unknown step error",
        completedAt: new Date(),
      },
    });
    await touchRunHeartbeat(params.runId);
    throw error;
  }
}

async function touchRunHeartbeat(runId: string) {
  await prisma.agentRun.updateMany({
    where: {
      id: runId,
      status: AgentRunStatus.RUNNING,
    },
    data: {
      lastHeartbeatAt: new Date(),
    },
  });
}

export async function executeAgentRunNow(runId: string) {
  const run = await prisma.agentRun.findUnique({
    where: { id: runId },
    include: {
      agent: {
        include: {
          template: {
            select: {
              id: true,
              name: true,
              slug: true,
              category: true,
              prompt: true,
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
    },
  });

  if (!run) {
    throw new Error("Agent run not found");
  }

  if (run.status === AgentRunStatus.COMPLETED || run.status === AgentRunStatus.FAILED) {
    return run;
  }

  const runInput = getRunInputObject(run.input);
  const objective = normalizeObjective(runInput.objective);
  if (!objective) {
    throw new Error("Agent objective is required");
  }
  const attemptNumber = Math.max(1, run.attemptCount);

  // If the same attempt is restarted, clear only that attempt's partial steps.
  await prisma.agentStep.deleteMany({
    where: { runId: run.id, attemptNumber },
  });

  await prisma.agentRun.update({
    where: { id: run.id },
    data: {
      status: AgentRunStatus.RUNNING,
      startedAt: run.startedAt ?? new Date(),
      error: null,
      completedAt: null,
      lastHeartbeatAt: new Date(),
    },
  });

  let completedSteps = 0;
  let creditUsed = 0;

  try {
    const planOutput = await runStep({
      runId: run.id,
      attemptNumber,
      stepNumber: 1,
      type: AgentStepType.PLAN,
      name: "Plan execution strategy",
      rationale: "Convert the user objective into a bounded, auditable step list.",
      input: { objective, maxSteps: run.agent.maxSteps },
      execute: async () =>
        buildPlanStepOutput({
          objective,
          maxSteps: run.agent.maxSteps,
          model: run.agent.defaultModel,
          agentName: run.agent.name,
          goal: run.agent.goal,
        }),
    });
    completedSteps += 1;

    const planCandidate = (planOutput as Record<string, unknown>).plan;
    const plan =
      Array.isArray(planCandidate) &&
      planCandidate.every((item: unknown) => typeof item === "string")
        ? (planCandidate as string[])
        : [];

    const templateOutput = await runStep({
      runId: run.id,
      attemptNumber,
      stepNumber: 2,
      type: AgentStepType.TOOL,
      name: "Select template",
      toolName: "template-catalog",
      rationale: "Choose the best available template to structure the draft output.",
      input: {
        preferredTemplateId: run.agent.templateId,
        inferredCategories: inferTemplateCategories(objective),
      },
      execute: async () => {
        let selected = run.agent.template;

        if (!selected) {
          const preferredCategories = inferTemplateCategories(objective);
          selected = await prisma.template.findFirst({
            where: {
              active: true,
              ...(preferredCategories.length > 0
                ? { category: { in: preferredCategories } }
                : {}),
            },
            orderBy: [{ builtIn: "desc" }, { updatedAt: "desc" }],
            select: {
              id: true,
              name: true,
              slug: true,
              category: true,
              prompt: true,
            },
          });
        }

        if (!selected) {
          selected = await prisma.template.findFirst({
            where: { active: true },
            orderBy: [{ builtIn: "desc" }, { updatedAt: "desc" }],
            select: {
              id: true,
              name: true,
              slug: true,
              category: true,
              prompt: true,
            },
          });
        }

        return {
          templateId: selected?.id ?? null,
          templateName: selected?.name ?? null,
          templateSlug: selected?.slug ?? null,
          templateCategory: selected?.category ?? null,
        };
      },
    });
    completedSteps += 1;

    const templateData = templateOutput as Record<string, unknown>;
    const selectedTemplateId =
      typeof templateData.templateId === "string" ? templateData.templateId : null;
    const selectedTemplate =
      selectedTemplateId != null
        ? await prisma.template.findUnique({
            where: { id: selectedTemplateId },
            select: {
              id: true,
              name: true,
              slug: true,
              category: true,
              prompt: true,
            },
          })
        : null;

    const outputStep = await runStep({
      runId: run.id,
      attemptNumber,
      stepNumber: 3,
      type: AgentStepType.OUTPUT,
      name: "Create draft output",
      rationale: "Persist a reviewable artifact and usage record for this run.",
      input: {
        objective,
        selectedTemplateId: selectedTemplate?.id ?? null,
      },
      execute: async () => {
        const draftResult = await buildDraftStepOutput({
          agentName: run.agent.name,
          goal: run.agent.goal,
          objective,
          systemPrompt: run.agent.systemPrompt,
          selectedTemplate,
          plan,
          model: run.agent.defaultModel,
        });
        const draft = draftResult.draft;
        const tokenCount = draftResult.usage.totalTokens;

        const created = await prisma.$transaction(async (tx) => {
          const document = await tx.document.create({
            data: {
              title: `${run.agent.name}: ${objective.slice(0, 60)}`,
              content: draft,
              userId: run.requestedById ?? run.agent.createdById,
              teamId: run.teamId ?? run.agent.teamId,
              templateId: selectedTemplate?.id,
            },
            select: {
              id: true,
            },
          });

          const generation = await tx.generation.create({
            data: {
              userId: run.requestedById ?? run.agent.createdById,
              teamId: run.teamId ?? run.agent.teamId,
              type: ContentType.TEXT,
              model: run.agent.defaultModel,
              input: objective,
              output: draft,
              creditCost: 1,
              tokens: tokenCount,
            },
            select: {
              id: true,
              creditCost: true,
              tokens: true,
            },
          });

          return { document, generation, draft };
        });

        return {
          documentId: created.document.id,
          generationId: created.generation.id,
          creditCost: created.generation.creditCost,
          tokenCount: created.generation.tokens,
          source: draftResult.source,
          llmModel: draftResult.model,
          llmUsage: draftResult.usage,
          fallbackReason:
            "fallbackReason" in draftResult ? draftResult.fallbackReason : null,
          preview: created.draft.slice(0, 240),
        };
      },
    });
    completedSteps += 1;

    const outputData = outputStep as Record<string, unknown>;
    creditUsed =
      typeof outputData.creditCost === "number" ? outputData.creditCost : 0;

    const summary = `Completed ${run.agent.name} run for objective: ${objective}`;

    const updatedRun = await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: AgentRunStatus.COMPLETED,
        summary,
        output: {
          objective,
          plan,
          selectedTemplate: selectedTemplate
            ? {
                id: selectedTemplate.id,
                name: selectedTemplate.name,
                slug: selectedTemplate.slug,
                category: selectedTemplate.category,
              }
            : null,
          artifact: {
            documentId:
              typeof outputData.documentId === "string" ? outputData.documentId : null,
            generationId:
              typeof outputData.generationId === "string"
                ? outputData.generationId
                : null,
          },
          llm: {
            source: typeof outputData.source === "string" ? outputData.source : null,
            model:
              typeof outputData.llmModel === "string" ? outputData.llmModel : null,
            usage:
              outputData.llmUsage && typeof outputData.llmUsage === "object"
                ? outputData.llmUsage
                : null,
            fallbackReason:
              typeof outputData.fallbackReason === "string"
                ? outputData.fallbackReason
                : null,
          },
          preview:
            typeof outputData.preview === "string" ? outputData.preview : null,
        },
        creditUsed,
        stepCount: completedSteps,
        completedAt: new Date(),
        lastHeartbeatAt: new Date(),
        workerId: null,
        error: null,
      },
      include: {
        steps: {
          orderBy: { stepNumber: "asc" },
        },
      },
    });

    void trackGa4ServerEvent({
      eventName: "agent_run_completed",
      userId: run.requestedById ?? run.agent.createdById,
      params: {
        run_id: run.id,
        agent_id: run.agent.id,
        trigger_type: run.triggerType,
        attempt: run.attemptCount,
        steps: completedSteps,
        credits_used: creditUsed,
        llm_source:
          typeof outputData.source === "string" ? outputData.source : "unknown",
        llm_model:
          typeof outputData.llmModel === "string" ? outputData.llmModel : null,
      },
    });

    return updatedRun;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agent run failed";

    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: AgentRunStatus.FAILED,
        error: message,
        stepCount: completedSteps,
        creditUsed,
        completedAt: new Date(),
        lastHeartbeatAt: new Date(),
        workerId: null,
      },
    });

    void trackGa4ServerEvent({
      eventName: "agent_run_failed",
      userId: run.requestedById ?? run.agent.createdById,
      params: {
        run_id: run.id,
        agent_id: run.agent.id,
        trigger_type: run.triggerType,
        attempt: run.attemptCount,
        steps: completedSteps,
        credits_used: creditUsed,
        error_message: message.slice(0, 100),
      },
    });

    throw error;
  }
}
