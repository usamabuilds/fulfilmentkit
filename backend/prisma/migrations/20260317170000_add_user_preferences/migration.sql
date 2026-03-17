-- AlterTable
ALTER TABLE "User"
ADD COLUMN "timezone" TEXT,
ADD COLUMN "locale" TEXT,
ADD COLUMN "defaultCurrency" TEXT,
ADD COLUMN "planningCadence" TEXT;
