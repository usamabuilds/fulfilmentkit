-- CreateTable
CREATE TABLE "SessionEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "orderId" TEXT,
    "externalSessionId" TEXT,
    "eventName" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "channel" TEXT,
    "referrerUrl" TEXT,
    "landingPageUrl" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "countryCode" TEXT,
    "deviceType" TEXT,
    "provenanceConnector" TEXT NOT NULL,
    "provenanceRef" TEXT,
    "provenancePayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttributionTouch" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "orderId" TEXT,
    "sessionEventId" TEXT,
    "source" TEXT NOT NULL,
    "medium" TEXT,
    "campaign" TEXT,
    "content" TEXT,
    "term" TEXT,
    "referrerUrl" TEXT,
    "landingPageUrl" TEXT,
    "touchpointAt" TIMESTAMP(3) NOT NULL,
    "provenanceConnector" TEXT NOT NULL,
    "provenanceRef" TEXT,
    "provenancePayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttributionTouch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SessionEvent_workspaceId_idx" ON "SessionEvent"("workspaceId");

-- CreateIndex
CREATE INDEX "SessionEvent_workspaceId_occurredAt_idx" ON "SessionEvent"("workspaceId", "occurredAt");

-- CreateIndex
CREATE INDEX "SessionEvent_workspaceId_source_occurredAt_idx" ON "SessionEvent"("workspaceId", "source", "occurredAt");

-- CreateIndex
CREATE INDEX "SessionEvent_workspaceId_externalSessionId_idx" ON "SessionEvent"("workspaceId", "externalSessionId");

-- CreateIndex
CREATE INDEX "SessionEvent_orderId_idx" ON "SessionEvent"("orderId");

-- CreateIndex
CREATE INDEX "AttributionTouch_workspaceId_idx" ON "AttributionTouch"("workspaceId");

-- CreateIndex
CREATE INDEX "AttributionTouch_workspaceId_touchpointAt_idx" ON "AttributionTouch"("workspaceId", "touchpointAt");

-- CreateIndex
CREATE INDEX "AttributionTouch_workspaceId_source_touchpointAt_idx" ON "AttributionTouch"("workspaceId", "source", "touchpointAt");

-- CreateIndex
CREATE INDEX "AttributionTouch_orderId_idx" ON "AttributionTouch"("orderId");

-- CreateIndex
CREATE INDEX "AttributionTouch_sessionEventId_idx" ON "AttributionTouch"("sessionEventId");

-- AddForeignKey
ALTER TABLE "SessionEvent" ADD CONSTRAINT "SessionEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionEvent" ADD CONSTRAINT "SessionEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributionTouch" ADD CONSTRAINT "AttributionTouch_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributionTouch" ADD CONSTRAINT "AttributionTouch_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributionTouch" ADD CONSTRAINT "AttributionTouch_sessionEventId_fkey" FOREIGN KEY ("sessionEventId") REFERENCES "SessionEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
