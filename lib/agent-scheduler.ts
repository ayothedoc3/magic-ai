import { AgentTriggerType } from "@prisma/client";
import { trackGa4ServerEvent } from "@/lib/analytics.server";
import { prisma } from "@/lib/prisma";

export type ScheduleDispatchResult = {
  scheduleId: string;
  runId: string;
  agentId: string;
};

export type ScheduleDispatchBatchResult = {
  dispatched: number;
  results: ScheduleDispatchResult[];
};

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function clampIntervalMinutes(value: number) {
  return Math.min(Math.max(1, Math.trunc(value)), 60 * 24 * 30);
}

function renderObjectiveTemplate(params: {
  template: string;
  agentName: string;
  now: Date;
}) {
  const { template, agentName, now } = params;
  const iso = now.toISOString();
  const date = iso.slice(0, 10);
  const time = iso.slice(11, 19);

  return template
    .replaceAll("{{agent_name}}", agentName)
    .replaceAll("{{now_iso}}", iso)
    .replaceAll("{{date}}", date)
    .replaceAll("{{time_utc}}", time)
    .trim();
}

export async function getAgentScheduleStats() {
  const now = new Date();
  const [total, enabled, due] = await Promise.all([
    prisma.agentSchedule.count(),
    prisma.agentSchedule.count({ where: { enabled: true } }),
    prisma.agentSchedule.count({
      where: {
        enabled: true,
        nextRunAt: { lte: now },
        agent: { enabled: true },
      },
    }),
  ]);

  return { total, enabled, due };
}

export async function claimAndDispatchNextDueAgentSchedule(options?: {
  workerId?: string;
}) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const now = new Date();
    const candidate = await prisma.agentSchedule.findFirst({
      where: {
        enabled: true,
        nextRunAt: { lte: now },
        agent: { enabled: true },
      },
      orderBy: [{ nextRunAt: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        intervalMinutes: true,
        objectiveTemplate: true,
        nextRunAt: true,
        agent: {
          select: {
            id: true,
            name: true,
            createdById: true,
            teamId: true,
            enabled: true,
          },
        },
      },
    });

    if (!candidate) return null;

    const intervalMinutes = clampIntervalMinutes(candidate.intervalMinutes);
    const dispatchTime = now;
    const nextRunAt = addMinutes(dispatchTime, intervalMinutes);

    const claimed = await prisma.agentSchedule.updateMany({
      where: {
        id: candidate.id,
        enabled: true,
        nextRunAt: candidate.nextRunAt,
      },
      data: {
        lastDispatchedAt: dispatchTime,
        nextRunAt,
      },
    });

    if (claimed.count !== 1) {
      continue;
    }

    const objective = renderObjectiveTemplate({
      template: candidate.objectiveTemplate,
      agentName: candidate.agent.name,
      now: dispatchTime,
    });

    const run = await prisma.agentRun.create({
      data: {
        agentId: candidate.agent.id,
        requestedById: candidate.agent.createdById,
        teamId: candidate.agent.teamId,
        triggerType: AgentTriggerType.SCHEDULE,
        input: {
          objective:
            objective ||
            `Scheduled run for ${candidate.agent.name} at ${dispatchTime.toISOString()}`,
          schedule: {
            scheduleId: candidate.id,
            scheduleName: candidate.name,
            workerId: options?.workerId ?? null,
          },
          createdAt: dispatchTime.toISOString(),
        },
      },
      select: {
        id: true,
      },
    });

    void trackGa4ServerEvent({
      eventName: "agent_schedule_dispatched",
      userId: candidate.agent.createdById,
      params: {
        schedule_id: candidate.id,
        agent_id: candidate.agent.id,
        interval_minutes: intervalMinutes,
      },
    });

    return {
      scheduleId: candidate.id,
      runId: run.id,
      agentId: candidate.agent.id,
    } satisfies ScheduleDispatchResult;
  }

  return null;
}

export async function dispatchDueAgentSchedulesBatch(
  limit = 10,
  options?: { workerId?: string }
): Promise<ScheduleDispatchBatchResult> {
  const results: ScheduleDispatchResult[] = [];

  for (let i = 0; i < Math.max(1, limit); i += 1) {
    const result = await claimAndDispatchNextDueAgentSchedule({
      workerId: options?.workerId,
    });
    if (!result) break;
    results.push(result);
  }

  return {
    dispatched: results.length,
    results,
  };
}
