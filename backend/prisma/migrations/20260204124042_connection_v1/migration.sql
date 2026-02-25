-- CreateEnum
CREATE TYPE "ConnectionPlatform" AS ENUM ('SHOPIFY', 'WOOCOMMERCE', 'AMAZON');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('ACTIVE', 'DISCONNECTED', 'ERROR');

-- CreateTable
CREATE TABLE "Connection" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "platform" "ConnectionPlatform" NOT NULL,
    "status" "ConnectionStatus" NOT NULL,
    "displayName" TEXT NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Connection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Connection_workspaceId_idx" ON "Connection"("workspaceId");

-- CreateIndex
CREATE INDEX "Connection_platform_idx" ON "Connection"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "Connection_workspaceId_platform_key" ON "Connection"("workspaceId", "platform");

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
