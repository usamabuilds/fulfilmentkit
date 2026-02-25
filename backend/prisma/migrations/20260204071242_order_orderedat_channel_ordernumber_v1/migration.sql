-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "channel" TEXT,
ADD COLUMN     "orderNumber" TEXT,
ADD COLUMN     "orderedAt" TIMESTAMP(3);
