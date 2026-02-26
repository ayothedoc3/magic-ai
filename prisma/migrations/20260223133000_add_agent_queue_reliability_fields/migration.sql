-- AlterTable
ALTER TABLE "AgentRun"
ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "maxAttempts" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN "workerId" TEXT,
ADD COLUMN "lastHeartbeatAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "AgentRun_lastHeartbeatAt_idx" ON "AgentRun"("lastHeartbeatAt");
