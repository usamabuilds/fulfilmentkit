-- CreateTable
CREATE TABLE "SkuDailyMetric" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "unitsSold" INTEGER NOT NULL,
    "revenue" DECIMAL(65,30) NOT NULL,
    "refundsAmount" DECIMAL(65,30) NOT NULL,
    "feesAmount" DECIMAL(65,30) NOT NULL,
    "avgPrice" DECIMAL(65,30) NOT NULL,
    "stockEnd" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkuDailyMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SkuDailyMetric_workspaceId_idx" ON "SkuDailyMetric"("workspaceId");

-- CreateIndex
CREATE INDEX "SkuDailyMetric_productId_idx" ON "SkuDailyMetric"("productId");

-- CreateIndex
CREATE INDEX "SkuDailyMetric_day_idx" ON "SkuDailyMetric"("day");

-- CreateIndex
CREATE UNIQUE INDEX "SkuDailyMetric_workspaceId_productId_day_key" ON "SkuDailyMetric"("workspaceId", "productId", "day");

-- AddForeignKey
ALTER TABLE "SkuDailyMetric" ADD CONSTRAINT "SkuDailyMetric_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkuDailyMetric" ADD CONSTRAINT "SkuDailyMetric_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
