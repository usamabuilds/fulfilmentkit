-- CreateEnum
CREATE TYPE "ForecastLevel" AS ENUM ('WORKSPACE', 'SKU');

-- CreateTable
CREATE TABLE "Forecast" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "productId" TEXT,
    "level" "ForecastLevel" NOT NULL,
    "method" TEXT NOT NULL,
    "from" TIMESTAMP(3) NOT NULL,
    "to" TIMESTAMP(3) NOT NULL,
    "horizonDays" INTEGER NOT NULL,
    "assumptions" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Forecast_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Forecast_workspaceId_idx" ON "Forecast"("workspaceId");

-- CreateIndex
CREATE INDEX "Forecast_productId_idx" ON "Forecast"("productId");

-- CreateIndex
CREATE INDEX "Forecast_level_idx" ON "Forecast"("level");

-- CreateIndex
CREATE INDEX "Forecast_createdAt_idx" ON "Forecast"("createdAt");

-- AddForeignKey
ALTER TABLE "Forecast" ADD CONSTRAINT "Forecast_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Forecast" ADD CONSTRAINT "Forecast_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
