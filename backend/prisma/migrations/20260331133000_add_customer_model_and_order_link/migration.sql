-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "externalId" TEXT,
    "emailCanonical" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "customerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_workspaceId_externalId_key" ON "Customer"("workspaceId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_workspaceId_emailCanonical_key" ON "Customer"("workspaceId", "emailCanonical");

-- CreateIndex
CREATE INDEX "Customer_workspaceId_createdAt_idx" ON "Customer"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_workspaceId_customerId_idx" ON "Order"("workspaceId", "customerId");

-- CreateIndex
CREATE INDEX "Order_workspaceId_customerId_orderedAt_idx" ON "Order"("workspaceId", "customerId", "orderedAt");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
