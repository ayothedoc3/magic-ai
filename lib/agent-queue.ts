import { AgentRunStatus, Prisma } from "@prisma/client";
import { executeAgentRunNow } from "@/lib/agent-runner";
import { prisma } from "@/lib/prisma";

const DEFAULT_STALE_AFTER_MS = 5 * 60 * 1000;
const DEFAULT_RETRY_BASE_DELAY_MS = 15 * 1000;
const DEFAULT_RETRY_MAX_DELAY_MS = 15 * 60 * 1000;

export type QueueProcessResult = {
  runId: string;
  status: "COMPLETED" | "FAILED" | "REQUEUED";
  error?: string;
};

export type QueueRecoveryResult = {
  scanned: number;
  requeued: number;
  failed: number;
};

export function getDefaultStaleAfterMs() {
  return DEFAULT_STALE_AFTER_MS;
}

function getRetryDelayMs(attemptCount: number) {
  const exponent = Math.max(0, attemptCount - 1);
  const delay = DEFAULT_RETRY_BASE_DELAY_MS * 2 ** exponent;
  return Math.min(delay, DEFAULT_RETRY_MAX_DELAY_MS);
}

function truncateError(message: string, max = 2000) {
  const trimmed = message.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 3)}...` : trimmed;
}

export async function getAgentQueueStats() {
  const now = new Date();
  const [queued, running, failed, readyQueued, delayedQueued] = await Promise.all([
    prisma.agentRun.count({ where: { status: AgentRunStatus.QUEUED } }),
    prisma.agentRun.count({ where: { status: AgentRunStatus.RUNNING } }),
    prisma.agentRun.count({ where: { status: AgentRunStatus.FAILED } }),
    prisma.agentRun.count({
      where: {
        status: AgentRunStatus.QUEUED,
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
      },
    }),
    prisma.agentRun.count({
      where: {
        status: AgentRunStatus.QUEUED,
        nextRetryAt: { gt: now },
      },
    }),
  ]);

  return { queued, running, failed, readyQueued, delayedQueued };
}

export async function recoverStaleRunningAgentRuns(options?: {
  staleAfterMs?: number;
  limit?: number;
}) {
  const staleAfterMs = Math.max(10_000, options?.staleAfterMs ?? DEFAULT_STALE_AFTER_MS);
  const limit = Math.max(1, options?.limit ?? 20);
  const cutoff = new Date(Date.now() - staleAfterMs);

  const staleRuns = await prisma.agentRun.findMany({
    where: {
      status: AgentRunStatus.RUNNING,
      OR: [
        { lastHeartbeatAt: { lte: cutoff } },
        { lastHeartbeatAt: null, startedAt: { lte: cutoff } },
      ],
    },
    orderBy: { startedAt: "asc" },
    take: limit,
    select: {
      id: true,
      attemptCount: true,
      maxAttempts: true,
      workerId: true,
    },
  });

  let requeued = 0;
  let failed = 0;

  for (const run of staleRuns) {
    const canRetry = run.attemptCount < run.maxAttempts;
    const nextRetryAt = canRetry
      ? new Date(Date.now() + getRetryDelayMs(run.attemptCount))
      : null;

    const result = await prisma.agentRun.updateMany({
      where: {
        id: run.id,
        status: AgentRunStatus.RUNNING,
      },
      data: canRetry
        ? {
            status: AgentRunStatus.QUEUED,
            completedAt: null,
            workerId: null,
            lastHeartbeatAt: null,
            nextRetryAt,
            error: truncateError(
              `Recovered stale run from ${
                run.workerId ?? "unknown-worker"
              } and requeued (attempt ${run.attemptCount}/${run.maxAttempts}, retry at ${nextRetryAt?.toISOString()}).`
            ),
          }
        : {
            status: AgentRunStatus.FAILED,
            completedAt: new Date(),
            workerId: null,
            lastHeartbeatAt: new Date(),
            nextRetryAt: null,
            error: truncateError(
              `Recovered stale run but max attempts exhausted (${run.attemptCount}/${run.maxAttempts}).`
            ),
          },
    });

    if (result.count === 1) {
      if (canRetry) requeued += 1;
      else failed += 1;
    }
  }

  return {
    scanned: staleRuns.length,
    requeued,
    failed,
  } satisfies QueueRecoveryResult;
}

export async function claimNextQueuedAgentRun(options?: { workerId?: string }) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const now = new Date();
    const candidate = await prisma.agentRun.findFirst({
      where: {
        status: AgentRunStatus.QUEUED,
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
      },
      orderBy: [{ nextRetryAt: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });

    if (!candidate) return null;

    const claimed = await prisma.agentRun.updateMany({
      where: {
        id: candidate.id,
        status: AgentRunStatus.QUEUED,
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
      },
      data: {
        status: AgentRunStatus.RUNNING,
        startedAt: now,
        completedAt: null,
        lastHeartbeatAt: now,
        nextRetryAt: null,
        workerId: options?.workerId ?? null,
        error: null,
        summary: null,
        output: Prisma.DbNull,
        stepCount: 0,
        creditUsed: 0,
        attemptCount: {
          increment: 1,
        },
      },
    });

    if (claimed.count === 1) {
      return candidate.id;
    }
  }

  return null;
}

async function requeueRunAfterFailureIfEligible(runId: string, errorMessage: string) {
  const run = await prisma.agentRun.findUnique({
    where: { id: runId },
    select: {
      id: true,
      status: true,
      attemptCount: true,
      maxAttempts: true,
    },
  });

  if (!run || run.status !== AgentRunStatus.FAILED) {
    return { requeued: false, terminal: true };
  }

  if (run.attemptCount >= run.maxAttempts) {
    return { requeued: false, terminal: true };
  }

  const delayMs = getRetryDelayMs(run.attemptCount);
  const nextRetryAt = new Date(Date.now() + delayMs);

  const updated = await prisma.agentRun.updateMany({
    where: {
      id: run.id,
      status: AgentRunStatus.FAILED,
    },
    data: {
      status: AgentRunStatus.QUEUED,
      completedAt: null,
      workerId: null,
      lastHeartbeatAt: null,
      nextRetryAt,
      error: truncateError(
        `Attempt ${run.attemptCount}/${run.maxAttempts} failed and was requeued for ${nextRetryAt.toISOString()}: ${errorMessage}`
      ),
    },
  });

  return {
    requeued: updated.count === 1,
    terminal: updated.count !== 1,
  };
}

export async function processNextQueuedAgentRun(options?: {
  workerId?: string;
  retryOnFailure?: boolean;
}): Promise<QueueProcessResult | null> {
  const runId = await claimNextQueuedAgentRun({ workerId: options?.workerId });
  if (!runId) return null;

  try {
    await executeAgentRunNow(runId);
    return { runId, status: "COMPLETED" };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown agent run error";

    if (options?.retryOnFailure !== false) {
      const retry = await requeueRunAfterFailureIfEligible(runId, message);
      if (retry.requeued) {
        return { runId, status: "REQUEUED", error: message };
      }
    }

    return {
      runId,
      status: "FAILED",
      error: message,
    };
  }
}

export async function processQueuedAgentRunsBatch(
  limit = 5,
  options?: {
    workerId?: string;
    retryOnFailure?: boolean;
  }
) {
  const results: QueueProcessResult[] = [];

  for (let i = 0; i < Math.max(1, limit); i += 1) {
    const result = await processNextQueuedAgentRun({
      workerId: options?.workerId,
      retryOnFailure: options?.retryOnFailure,
    });
    if (!result) break;
    results.push(result);
  }

  return results;
}
