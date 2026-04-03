-- Add durable identity key for fulfillment status event sync writes.
ALTER TABLE "OrderFulfillmentStatusEvent"
ADD COLUMN "externalRef" TEXT;

-- Backfill existing rows using the fallback logical identity shape.
UPDATE "OrderFulfillmentStatusEvent" AS e
SET "externalRef" = (
  'sync:' || o."externalRef" || ':fulfillment_timeline:fallback:' || e."status"::text || ':' ||
  to_char(e."eventAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
)
FROM "Order" AS o
WHERE o."id" = e."orderId"
  AND e."externalRef" IS NULL;

ALTER TABLE "OrderFulfillmentStatusEvent"
ALTER COLUMN "externalRef" SET NOT NULL;

CREATE UNIQUE INDEX "OrderFulfillmentStatusEvent_workspaceId_externalRef_key"
ON "OrderFulfillmentStatusEvent"("workspaceId", "externalRef");
