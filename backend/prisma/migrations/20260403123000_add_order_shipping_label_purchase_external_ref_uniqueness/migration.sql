-- Add durable identity key for shipping label purchase sync writes.
ALTER TABLE "OrderShippingLabelPurchase"
ADD COLUMN "externalRef" TEXT;

-- Backfill existing rows using the fallback logical identity shape.
UPDATE "OrderShippingLabelPurchase" AS l
SET "externalRef" = (
  'sync:' || o."externalRef" || ':shipping_label_purchase:fallback:' || l."carrier" || ':' || l."service" || ':' ||
  to_char(l."purchasedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
)
FROM "Order" AS o
WHERE o."id" = l."orderId"
  AND l."externalRef" IS NULL;

ALTER TABLE "OrderShippingLabelPurchase"
ALTER COLUMN "externalRef" SET NOT NULL;

CREATE UNIQUE INDEX "OrderShippingLabelPurchase_workspaceId_externalRef_key"
ON "OrderShippingLabelPurchase"("workspaceId", "externalRef");
