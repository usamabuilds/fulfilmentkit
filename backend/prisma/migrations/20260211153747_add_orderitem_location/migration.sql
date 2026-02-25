-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "locationId" TEXT;

-- CreateIndex
CREATE INDEX "OrderItem_locationId_idx" ON "OrderItem"("locationId");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
