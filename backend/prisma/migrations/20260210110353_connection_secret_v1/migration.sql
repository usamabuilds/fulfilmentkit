-- CreateTable
CREATE TABLE "ConnectionSecret" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "platform" "ConnectionPlatform" NOT NULL,
    "authType" TEXT NOT NULL,
    "secretCiphertext" BYTEA NOT NULL,
    "secretMetadata" JSONB,
    "lastValidatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConnectionSecret_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConnectionSecret_connectionId_key" ON "ConnectionSecret"("connectionId");

-- CreateIndex
CREATE INDEX "ConnectionSecret_workspaceId_idx" ON "ConnectionSecret"("workspaceId");

-- CreateIndex
CREATE INDEX "ConnectionSecret_platform_idx" ON "ConnectionSecret"("platform");

-- CreateIndex
CREATE INDEX "ConnectionSecret_workspaceId_platform_idx" ON "ConnectionSecret"("workspaceId", "platform");

-- AddForeignKey
ALTER TABLE "ConnectionSecret" ADD CONSTRAINT "ConnectionSecret_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "Connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
