-- AlterTable
ALTER TABLE "AgentRun"
ADD COLUMN "nextRetryAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "AgentStep"
ADD COLUMN "attemptNumber" INTEGER NOT NULL DEFAULT 1;

-- DropIndex
DROP INDEX "AgentStep_runId_stepNumber_key";

-- CreateIndex
CREATE INDEX "AgentRun_nextRetryAt_idx" ON "AgentRun"("nextRetryAt");

-- CreateIndex
CREATE INDEX "AgentStep_attemptNumber_idx" ON "AgentStep"("attemptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "AgentStep_runId_attemptNumber_stepNumber_key" ON "AgentStep"("runId", "attemptNumber", "stepNumber");
