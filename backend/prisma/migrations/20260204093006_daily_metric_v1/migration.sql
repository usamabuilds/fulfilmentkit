-- CreateTable
CREATE TABLE "DailyMetric" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "revenue" DECIMAL(65,30) NOT NULL,
    "orders" INTEGER NOT NULL,
    "units" INTEGER NOT NULL,
    "refundsAmount" DECIMAL(65,30) NOT NULL,
    "feesAmount" DECIMAL(65,30) NOT NULL,
    "cogsAmount" DECIMAL(65,30) NOT NULL,
    "grossMarginAmount" DECIMAL(65,30) NOT NULL,
    "grossMarginPercent" DECIMAL(65,30) NOT NULL,
    "stockoutsCount" INTEGER NOT NULL,
    "lowStockCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyMetric_workspaceId_idx" ON "DailyMetric"("workspaceId");

-- CreateIndex
CREATE INDEX "DailyMetric_day_idx" ON "DailyMetric"("day");

-- CreateIndex
CREATE UNIQUE INDEX "DailyMetric_workspaceId_day_key" ON "DailyMetric"("workspaceId", "day");

-- AddForeignKey
ALTER TABLE "DailyMetric" ADD CONSTRAINT "DailyMetric_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
