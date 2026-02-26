import {
  dispatchDueAgentSchedulesBatch,
  getAgentScheduleStats,
} from "../lib/agent-scheduler";
import { prisma } from "../lib/prisma";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function main() {
  const pollMs = toPositiveInt(process.env.AGENT_SCHEDULER_POLL_MS, 5000);
  const batchSize = toPositiveInt(process.env.AGENT_SCHEDULER_BATCH_SIZE, 10);
  const once =
    process.argv.includes("--once") || process.env.AGENT_SCHEDULER_ONCE === "1";

  const workerId = process.env.AGENT_SCHEDULER_ID ?? `scheduler-${process.pid}`;
  let shouldStop = false;

  const stop = () => {
    shouldStop = true;
  };

  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  console.log(
    `[agent-scheduler] starting ${workerId} (batch=${batchSize}, pollMs=${pollMs}, once=${once})`
  );

  try {
    do {
      const dispatched = await dispatchDueAgentSchedulesBatch(batchSize, { workerId });

      if (dispatched.dispatched > 0) {
        console.log(
          `[agent-scheduler] dispatched=${dispatched.dispatched} scheduled run(s)`
        );
        for (const result of dispatched.results) {
          console.log(
            `[agent-scheduler] schedule ${result.scheduleId} -> run ${result.runId}`
          );
        }
      } else if (once) {
        console.log("[agent-scheduler] no due schedules");
      } else {
        const stats = await getAgentScheduleStats();
        console.log(
          `[agent-scheduler] idle (total=${stats.total}, enabled=${stats.enabled}, due=${stats.due})`
        );
        await sleep(pollMs);
      }

      if (once) break;
    } while (!shouldStop);
  } finally {
    await prisma.$disconnect();
    console.log("[agent-scheduler] stopped");
  }
}

main().catch(async (error) => {
  console.error(
    `[agent-scheduler] fatal error: ${error instanceof Error ? error.stack ?? error.message : String(error)}`
  );
  await prisma.$disconnect();
  process.exit(1);
});
