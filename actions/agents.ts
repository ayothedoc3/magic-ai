"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { trackGa4ServerEvent } from "@/lib/analytics.server";
import {
  getDefaultStaleAfterMs,
  processQueuedAgentRunsBatch,
  recoverStaleRunningAgentRuns,
} from "@/lib/agent-queue";
import { dispatchDueAgentSchedulesBatch } from "@/lib/agent-scheduler";
import { prisma } from "@/lib/prisma";

const createAgentSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(240).optional().or(z.literal("")),
  goal: z.string().trim().min(5).max(4000),
  systemPrompt: z.string().trim().max(4000).optional().or(z.literal("")),
  templateId: z.string().trim().optional().or(z.literal("")),
  useActiveTeam: z.boolean().optional().default(false),
});

const runAgentSchema = z.object({
  agentId: z.string().trim().min(1),
  objective: z.string().trim().min(5).max(4000),
});

const toggleAgentSchema = z.object({
  agentId: z.string().trim().min(1),
  enabled: z.enum(["true", "false"]),
});

const processQueueSchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(3),
});

const createScheduleSchema = z.object({
  agentId: z.string().trim().min(1),
  name: z.string().trim().min(2).max(80),
  intervalMinutes: z.coerce.number().int().min(1).max(60 * 24 * 30),
  objectiveTemplate: z.string().trim().min(5).max(4000),
});

const toggleScheduleSchema = z.object({
  scheduleId: z.string().trim().min(1),
  enabled: z.enum(["true", "false"]),
});

const dispatchSchedulesSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

async function requireSessionUser() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      activeTeamId: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  return user;
}

async function generateUniqueAgentSlug(name: string) {
  const base = slugify(name) || "agent";
  let slug = base;
  let attempt = 2;

  while (true) {
    const existing = await prisma.agent.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing) return slug;

    slug = `${base}-${attempt}`;
    attempt += 1;
  }
}

async function assertAgentAccess(agentId: string, user: Awaited<ReturnType<typeof requireSessionUser>>) {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: {
      id: true,
      teamId: true,
      createdById: true,
      enabled: true,
    },
  });

  if (!agent) {
    throw new Error("Agent not found");
  }

  const hasAccess =
    user.role === "ADMIN" ||
    agent.createdById === user.id ||
    (Boolean(user.activeTeamId) && agent.teamId === user.activeTeamId);

  if (!hasAccess) {
    throw new Error("You do not have access to this agent");
  }

  return agent;
}

async function assertAgentScheduleAccess(
  scheduleId: string,
  user: Awaited<ReturnType<typeof requireSessionUser>>
) {
  const schedule = await prisma.agentSchedule.findUnique({
    where: { id: scheduleId },
    select: {
      id: true,
      agentId: true,
      enabled: true,
      agent: {
        select: {
          createdById: true,
          teamId: true,
        },
      },
    },
  });

  if (!schedule) {
    throw new Error("Schedule not found");
  }

  const hasAccess =
    user.role === "ADMIN" ||
    schedule.agent.createdById === user.id ||
    (Boolean(user.activeTeamId) && schedule.agent.teamId === user.activeTeamId);

  if (!hasAccess) {
    throw new Error("You do not have access to this schedule");
  }

  return schedule;
}

export async function createAgentAction(formData: FormData) {
  const user = await requireSessionUser();

  const parsed = createAgentSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    goal: formData.get("goal"),
    systemPrompt: formData.get("systemPrompt"),
    templateId: formData.get("templateId"),
    useActiveTeam: formData.get("useActiveTeam") === "on",
  });

  if (!parsed.success) {
    redirect(`/agents?error=${encodeURIComponent(parsed.error.errors[0].message)}`);
  }

  const slug = await generateUniqueAgentSlug(parsed.data.name);

  const createdAgent = await prisma.agent.create({
    data: {
      name: parsed.data.name,
      slug,
      description: parsed.data.description || null,
      goal: parsed.data.goal,
      systemPrompt: parsed.data.systemPrompt || null,
      templateId: parsed.data.templateId || null,
      createdById: user.id,
      teamId: parsed.data.useActiveTeam ? user.activeTeamId : null,
      toolConfig: {
        allowTemplateCatalog: true,
        allowDocumentWrite: true,
        allowGenerationWrite: true,
      },
    },
    select: {
      id: true,
      teamId: true,
    },
  });

  void trackGa4ServerEvent({
    eventName: "agent_created",
    userId: user.id,
    params: {
      agent_id: createdAgent.id,
      team_scoped: Boolean(createdAgent.teamId),
      has_template: Boolean(parsed.data.templateId),
    },
  });

  revalidatePath("/agents");
  redirect("/agents?created=1");
}

export async function toggleAgentEnabledAction(formData: FormData) {
  const user = await requireSessionUser();

  const parsed = toggleAgentSchema.safeParse({
    agentId: formData.get("agentId"),
    enabled: formData.get("enabled"),
  });

  if (!parsed.success) {
    redirect("/agents?error=Invalid+toggle+request");
  }

  await assertAgentAccess(parsed.data.agentId, user);

  await prisma.agent.update({
    where: { id: parsed.data.agentId },
    data: {
      enabled: parsed.data.enabled === "true",
    },
  });

  revalidatePath("/agents");
  redirect("/agents?updated=1");
}

export async function runAgentAction(formData: FormData) {
  const user = await requireSessionUser();

  const parsed = runAgentSchema.safeParse({
    agentId: formData.get("agentId"),
    objective: formData.get("objective"),
  });

  if (!parsed.success) {
    redirect(`/agents?error=${encodeURIComponent(parsed.error.errors[0].message)}`);
  }

  const agent = await assertAgentAccess(parsed.data.agentId, user);

  if (!agent.enabled) {
    redirect("/agents?error=Agent+is+disabled");
  }

  const run = await prisma.agentRun.create({
    data: {
      agentId: agent.id,
      requestedById: user.id,
      teamId: agent.teamId ?? user.activeTeamId,
      input: {
        objective: parsed.data.objective,
        createdAt: new Date().toISOString(),
      },
      triggerType: "MANUAL",
    },
    select: {
      id: true,
    },
  });

  void trackGa4ServerEvent({
    eventName: "agent_run_queued",
    userId: user.id,
    params: {
      agent_id: agent.id,
      trigger_type: "manual",
      objective_length: parsed.data.objective.length,
      team_scoped: Boolean(agent.teamId ?? user.activeTeamId),
    },
  });

  revalidatePath("/agents");
  revalidatePath(`/agents/runs/${run.id}`);
  redirect(`/agents/runs/${run.id}?queued=1`);
}

export async function createAgentScheduleAction(formData: FormData) {
  const user = await requireSessionUser();

  const parsed = createScheduleSchema.safeParse({
    agentId: formData.get("agentId"),
    name: formData.get("name"),
    intervalMinutes: formData.get("intervalMinutes"),
    objectiveTemplate: formData.get("objectiveTemplate"),
  });

  if (!parsed.success) {
    redirect(`/agents?error=${encodeURIComponent(parsed.error.errors[0].message)}`);
  }

  const agent = await assertAgentAccess(parsed.data.agentId, user);
  const now = new Date();
  const nextRunAt = new Date(now.getTime() + parsed.data.intervalMinutes * 60 * 1000);

  const schedule = await prisma.agentSchedule.create({
    data: {
      agentId: agent.id,
      name: parsed.data.name,
      intervalMinutes: parsed.data.intervalMinutes,
      objectiveTemplate: parsed.data.objectiveTemplate,
      nextRunAt,
    },
    select: {
      id: true,
    },
  });

  void trackGa4ServerEvent({
    eventName: "agent_schedule_created",
    userId: user.id,
    params: {
      schedule_id: schedule.id,
      agent_id: agent.id,
      interval_minutes: parsed.data.intervalMinutes,
    },
  });

  revalidatePath("/agents");
  redirect("/agents?scheduledCreated=1");
}

export async function toggleAgentScheduleEnabledAction(formData: FormData) {
  const user = await requireSessionUser();

  const parsed = toggleScheduleSchema.safeParse({
    scheduleId: formData.get("scheduleId"),
    enabled: formData.get("enabled"),
  });

  if (!parsed.success) {
    redirect("/agents?error=Invalid+schedule+toggle+request");
  }

  await assertAgentScheduleAccess(parsed.data.scheduleId, user);

  await prisma.agentSchedule.update({
    where: { id: parsed.data.scheduleId },
    data: {
      enabled: parsed.data.enabled === "true",
    },
  });

  void trackGa4ServerEvent({
    eventName: "agent_schedule_toggled",
    userId: user.id,
    params: {
      schedule_id: parsed.data.scheduleId,
      enabled: parsed.data.enabled === "true",
    },
  });

  revalidatePath("/agents");
  redirect("/agents?scheduleUpdated=1");
}

export async function processAgentQueueAction(formData: FormData) {
  const user = await requireSessionUser();

  if (user.role !== "ADMIN") {
    redirect("/agents?error=Only+admins+can+process+the+queue+manually");
  }

  const parsed = processQueueSchema.safeParse({
    limit: formData.get("limit"),
  });

  if (!parsed.success) {
    redirect("/agents?error=Invalid+queue+processing+request");
  }

  const recovered = await recoverStaleRunningAgentRuns({
    staleAfterMs: getDefaultStaleAfterMs(),
    limit: parsed.data.limit,
  });

  const results = await processQueuedAgentRunsBatch(parsed.data.limit, {
    workerId: `manual-admin-${user.id}`,
    retryOnFailure: true,
  });
  const processed = results.length;
  const failed = results.filter((result) => result.status === "FAILED").length;
  const requeued = results.filter((result) => result.status === "REQUEUED").length;

  void trackGa4ServerEvent({
    eventName: "agent_queue_batch_processed",
    userId: user.id,
    params: {
      processed,
      failed,
      requeued,
      recovered: recovered.requeued,
      mode: "manual_admin",
    },
  });

  revalidatePath("/agents");
  redirect(
    `/agents?processed=${processed}&failed=${failed}&requeued=${requeued}&recovered=${recovered.requeued}`
  );
}

export async function dispatchAgentSchedulesAction(formData: FormData) {
  const user = await requireSessionUser();

  if (user.role !== "ADMIN") {
    redirect("/agents?error=Only+admins+can+dispatch+schedules+manually");
  }

  const parsed = dispatchSchedulesSchema.safeParse({
    limit: formData.get("limit"),
  });

  if (!parsed.success) {
    redirect("/agents?error=Invalid+schedule+dispatch+request");
  }

  const result = await dispatchDueAgentSchedulesBatch(parsed.data.limit, {
    workerId: `manual-scheduler-${user.id}`,
  });

  void trackGa4ServerEvent({
    eventName: "agent_schedules_dispatched",
    userId: user.id,
    params: {
      dispatched: result.dispatched,
      limit: parsed.data.limit,
      mode: "manual_admin",
    },
  });

  revalidatePath("/agents");
  redirect(`/agents?scheduledDispatch=${result.dispatched}`);
}
