-- AlterTable
ALTER TABLE "User" ADD COLUMN     "credits" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "SlopReport" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "patterns" JSONB NOT NULL,
    "totalCount" INTEGER NOT NULL,
    "criticalCount" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "canAutoFix" BOOLEAN NOT NULL DEFAULT true,
    "repoId" TEXT NOT NULL,
    "branchName" TEXT NOT NULL,
    "prNumber" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "cleanupJobId" TEXT,
    "fixedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlopReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditTransaction" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "jobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SlopReport_jobId_key" ON "SlopReport"("jobId");

-- CreateIndex
CREATE INDEX "SlopReport_jobId_idx" ON "SlopReport"("jobId");

-- CreateIndex
CREATE INDEX "SlopReport_userId_idx" ON "SlopReport"("userId");

-- CreateIndex
CREATE INDEX "SlopReport_status_idx" ON "SlopReport"("status");

-- CreateIndex
CREATE INDEX "CreditTransaction_userId_idx" ON "CreditTransaction"("userId");

-- CreateIndex
CREATE INDEX "CreditTransaction_createdAt_idx" ON "CreditTransaction"("createdAt");

-- AddForeignKey
ALTER TABLE "SlopReport" ADD CONSTRAINT "SlopReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
