-- CreateEnum
CREATE TYPE "OrderFulfillmentStatus" AS ENUM ('PLACED', 'FULFILLED', 'SHIPPED', 'DELIVERED');

-- CreateTable
CREATE TABLE "OrderFulfillmentStatusEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "OrderFulfillmentStatus" NOT NULL,
    "eventAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderFulfillmentStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderShippingLabelPurchase" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "carrier" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "packageType" TEXT NOT NULL,
    "labelCost" DECIMAL(65,30) NOT NULL,
    "customerPaidCost" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderShippingLabelPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderFulfillmentStatusEvent_workspaceId_idx" ON "OrderFulfillmentStatusEvent"("workspaceId");

-- CreateIndex
CREATE INDEX "OrderFulfillmentStatusEvent_orderId_idx" ON "OrderFulfillmentStatusEvent"("orderId");

-- CreateIndex
CREATE INDEX "OrderFulfillmentStatusEvent_workspaceId_eventAt_idx" ON "OrderFulfillmentStatusEvent"("workspaceId", "eventAt");

-- CreateIndex
CREATE INDEX "OrderFulfillmentStatusEvent_workspaceId_status_eventAt_idx" ON "OrderFulfillmentStatusEvent"("workspaceId", "status", "eventAt");

-- CreateIndex
CREATE INDEX "OrderShippingLabelPurchase_workspaceId_idx" ON "OrderShippingLabelPurchase"("workspaceId");

-- CreateIndex
CREATE INDEX "OrderShippingLabelPurchase_orderId_idx" ON "OrderShippingLabelPurchase"("orderId");

-- CreateIndex
CREATE INDEX "OrderShippingLabelPurchase_workspaceId_purchasedAt_idx" ON "OrderShippingLabelPurchase"("workspaceId", "purchasedAt");

-- AddForeignKey
ALTER TABLE "OrderFulfillmentStatusEvent" ADD CONSTRAINT "OrderFulfillmentStatusEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderFulfillmentStatusEvent" ADD CONSTRAINT "OrderFulfillmentStatusEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderShippingLabelPurchase" ADD CONSTRAINT "OrderShippingLabelPurchase_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderShippingLabelPurchase" ADD CONSTRAINT "OrderShippingLabelPurchase_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
