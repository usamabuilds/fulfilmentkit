-- CreateTable
CREATE TABLE "ConnectionOAuthState" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "platform" "ConnectionPlatform" NOT NULL,
    "stateHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConnectionOAuthState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConnectionOAuthState_stateHash_key" ON "ConnectionOAuthState"("stateHash");

-- CreateIndex
CREATE INDEX "ConnectionOAuthState_workspaceId_idx" ON "ConnectionOAuthState"("workspaceId");

-- CreateIndex
CREATE INDEX "ConnectionOAuthState_connectionId_idx" ON "ConnectionOAuthState"("connectionId");

-- CreateIndex
CREATE INDEX "ConnectionOAuthState_platform_idx" ON "ConnectionOAuthState"("platform");

-- CreateIndex
CREATE INDEX "ConnectionOAuthState_expiresAt_idx" ON "ConnectionOAuthState"("expiresAt");

-- CreateIndex
CREATE INDEX "ConnectionOAuthState_workspaceId_connectionId_platform_idx" ON "ConnectionOAuthState"("workspaceId", "connectionId", "platform");

-- AddForeignKey
ALTER TABLE "ConnectionOAuthState" ADD CONSTRAINT "ConnectionOAuthState_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectionOAuthState" ADD CONSTRAINT "ConnectionOAuthState_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "Connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
