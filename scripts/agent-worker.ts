import {
  getAgentQueueStats,
  getDefaultStaleAfterMs,
  processQueuedAgentRunsBatch,
  recoverStaleRunningAgentRuns,
} from "../lib/agent-queue";
import { prisma } from "../lib/prisma";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function main() {
  const pollMs = toPositiveInt(process.env.AGENT_WORKER_POLL_MS, 2000);
  const batchSize = toPositiveInt(process.env.AGENT_WORKER_BATCH_SIZE, 5);
  const staleAfterMs = toPositiveInt(
    process.env.AGENT_WORKER_STALE_AFTER_MS,
    getDefaultStaleAfterMs()
  );
  const recoverLimit = toPositiveInt(process.env.AGENT_WORKER_RECOVER_LIMIT, 10);
  const once =
    process.argv.includes("--once") || process.env.AGENT_WORKER_ONCE === "1";

  const workerId = process.env.AGENT_WORKER_ID ?? `worker-${process.pid}`;
  let shouldStop = false;

  const stop = () => {
    shouldStop = true;
  };

  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  console.log(
    `[agent-worker] starting ${workerId} (batch=${batchSize}, pollMs=${pollMs}, staleAfterMs=${staleAfterMs}, once=${once})`
  );

  try {
    do {
      const recovered = await recoverStaleRunningAgentRuns({
        staleAfterMs,
        limit: recoverLimit,
      });

      if (recovered.requeued > 0 || recovered.failed > 0) {
        console.log(
          `[agent-worker] recovered stale runs: requeued=${recovered.requeued} failed=${recovered.failed}`
        );
      }

      const results = await processQueuedAgentRunsBatch(batchSize, {
        workerId,
        retryOnFailure: true,
      });

      if (results.length > 0) {
        const failed = results.filter((result) => result.status === "FAILED");
        const requeued = results.filter((result) => result.status === "REQUEUED");
        console.log(
          `[agent-worker] processed=${results.length} failed=${failed.length} requeued=${requeued.length}`
        );

        for (const result of results) {
          if (result.status === "FAILED") {
            console.error(
              `[agent-worker] run ${result.runId} failed: ${result.error ?? "Unknown error"}`
            );
          } else if (result.status === "REQUEUED") {
            console.warn(
              `[agent-worker] run ${result.runId} requeued after failure: ${result.error ?? "Unknown error"}`
            );
          } else {
            console.log(`[agent-worker] run ${result.runId} completed`);
          }
        }
      } else if (once) {
        console.log("[agent-worker] no queued runs");
      } else {
        const stats = await getAgentQueueStats();
        console.log(
          `[agent-worker] idle (queued=${stats.queued}, ready=${stats.readyQueued}, waiting=${stats.delayedQueued}, running=${stats.running})`
        );
        await sleep(pollMs);
      }

      if (once) break;
    } while (!shouldStop);
  } finally {
    await prisma.$disconnect();
    console.log("[agent-worker] stopped");
  }
}

main().catch(async (error) => {
  console.error(
    `[agent-worker] fatal error: ${error instanceof Error ? error.stack ?? error.message : String(error)}`
  );
  await prisma.$disconnect();
  process.exit(1);
});
