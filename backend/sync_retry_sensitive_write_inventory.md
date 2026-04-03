# Stable Logical Identity for Retry-Sensitive Sync Outputs

## Grounding
- This identity-definition pass is grounded in the existing retry-sensitive inventory output in `backend/sync_retry_sensitive_write_inventory.md` and in the current sync worker implementation (`ConnectionSyncWorker`) that performs historical order ingestion for fees, fulfillment events, and shipping label purchases.
- The worker execution path remains `POST /connections/:id/sync` producer (`ConnectionsService.triggerManualSync`) → BullMQ `sync:run_connection` consumer (`ConnectionSyncWorker.process`) with retry options `attempts: 5` and exponential backoff.
- The three retry-sensitive create-only branches are executed only when `historicalOrders` are present on the job payload.

## Relationship to the Completed Retry-Sensitive Write Inventory
- This document treats the completed inventory as locked baseline and does **not** re-scope output types.
- It defines logical identity only (what makes two writes the same logical record under replay), without proposing fixes or schema changes.
- Conclusions here intentionally preserve the inventory finding that marker-first dedupe and target-row identity are separate concerns.

## Locked Output Types From the Previous Task
From the completed inventory, the locked retry-sensitive create-only output types are:
1. `Fee`
2. `OrderFulfillmentStatusEvent`
3. `OrderShippingLabelPurchase`

No additional output types are introduced in this identity-definition task.

## Fee Logical Identity
Current create branch (`ingestHistoricalOrderContextHooks`):
- Source rows: `payload.payment_transactions`, `payload.transactions`, and `payload.gateway_fees`.
- Marker key currently used: `sync:${orderExternalRef}:payment_gateway:${externalId}`.
- Create currently writes a fee row with semantic payload (`type`, `amount`, `currency`) tied to one order.

Stable source facts available (in descending preference):
1. `orderExternalRef` (stable order anchor from upstream order id mapping).
2. External fee/transaction identifier when present (`row.id`, `row.transaction_id`, `row.gateway_transaction_id`) normalized.
3. Semantic fee fields (`type`, `amount`, `currency`) as descriptive attributes.

Unsafe identity inputs currently used in fallback:
- Fallback `externalId` fragment: `${kindOrType}:${created_atOrUnknown}` is not guaranteed stable across retries when upstream omits `id` and/or mutates timestamps or formatting.
- Any value that can collapse to `'unknown'` in fallback construction.

Logical identity definition for `Fee`:
- **Primary logical identity**: `(workspaceId, orderExternalRef, normalized upstream fee/transaction id)` when upstream id exists.
- **When upstream id is missing**: current code can only imply identity via a synthetic fallback token, which is not provably stable; therefore identity is **partial/weak** in that path.

Presence in current code:
- Identity is **implicit in marker generation** (`externalEventId`) and mirrored into `fee.externalRef` at write time.
- Because fallback marker token can be unstable, the logical identity is not uniformly strong for all input shapes.

## Fulfillment Status Event Logical Identity
Current create branch (`ingestHistoricalOrder`):
- Source rows: `payload.fulfillment_timeline` or `payload.fulfillment_events`.
- Marker key currently used: `sync:${orderExternalRef}:fulfillment_timeline:${eventExternalId}`.
- `eventExternalId` currently resolves as: upstream event id (`event.id` or `event.event_id`) else `${mappedStatus}:${eventAt.toISOString()}`.
- Create writes `status` + `eventAt` + `orderId`.

Stable source facts available:
1. `orderExternalRef`.
2. Upstream event identifier (`event.id`/`event.event_id`) when present.
3. Source-defined event timestamp `eventAt` and normalized status `mappedStatus`.

Unsafe identity inputs:
- Derived fallback identity from normalized status text plus timestamp string can drift if status mapping logic changes or timestamp precision/format differs.
- Display/name variants (`event.name`, `event.state`) are not guaranteed immutable identity keys.

Logical identity definition for `OrderFulfillmentStatusEvent`:
- **Primary logical identity**: `(workspaceId, orderExternalRef, normalized upstream fulfillment event id)` when present.
- **Fallback logical identity (best available only)**: `(workspaceId, orderExternalRef, mappedStatus, source-defined eventAt instant)` when no upstream event id exists.

Presence in current code:
- Identity is **implicit in marker generation**.
- No dedicated target-table uniqueness exists for this logical identity in current schema.

## Shipping Label Purchase Logical Identity
Current create branch (`ingestHistoricalOrder`):
- Source rows: `payload.shipping_labels` or `payload.shipping_label_purchases`.
- Marker key currently used: `sync:${orderExternalRef}:shipping_label_purchase:${labelExternalId}`.
- `labelExternalId` currently resolves as: upstream label id (`label.id` or `label.label_id`) else `${carrier}:${service}:${purchasedAt.toISOString()}`.
- Create writes `carrier`, `service`, `packageType`, costs, `currency`, `purchasedAt`.

Stable source facts available:
1. `orderExternalRef`.
2. Upstream shipping-label identifier (`label.id`/`label.label_id`) when present.
3. Source-defined purchase instant `purchasedAt`.

Unsafe identity inputs:
- Fallback carrier/service text tokens (`unknown` default possible) are descriptive, not durable identifiers.
- Fallback built from carrier/service + timestamp can collide or drift when labels share same service window or source formatting changes.

Logical identity definition for `OrderShippingLabelPurchase`:
- **Primary logical identity**: `(workspaceId, orderExternalRef, normalized upstream label id)` when present.
- **Fallback logical identity (best available only)**: `(workspaceId, orderExternalRef, purchasedAt instant, carrier, service)` when no upstream label id exists, recognizing weaker guarantees.

Presence in current code:
- Identity is **implicit in marker generation**.
- No dedicated target-table uniqueness exists for this logical identity in current schema.

## Identity Fields That Are Stable
Across the three locked output types, the currently stable identity-capable fields are:
- `workspaceId` (workspace boundary).
- `orderExternalRef` (stable order anchor used to scope marker IDs).
- Upstream object IDs when present:
  - fee/transaction ids (`id` / `transaction_id` / `gateway_transaction_id`)
  - fulfillment event ids (`id` / `event_id`)
  - shipping label ids (`id` / `label_id`)
- Source-defined event instants (`eventAt`, `purchasedAt`) as secondary discriminators when source IDs are absent.

## Identity Fields That Must Not Be Trusted
The following must not be treated as strong logical identity keys:
- Processing timestamps (`new Date()` in marker payload metadata, `receivedAt`, `processedAt`, `capturedAt`, DB `createdAt`/`updatedAt`).
- Display or mapped text alone (`status` labels, carrier/service/package strings, `kind`/`type` names).
- Any fallback token containing `'unknown'` placeholders.
- Marker existence by itself as proof of durable target-row identity.

## Current-Code Gaps in Identity Definition
- Marker IDs are the only explicit dedupe anchor for the three create-only writes; identity is not represented as dedicated unique constraints on `OrderFulfillmentStatusEvent` or `OrderShippingLabelPurchase`.
- For `Fee`, current sync logic writes `externalRef` on create, but the active Prisma `Fee` model in current code does not declare `externalRef`; this indicates identity intent exists in worker logic but is not cleanly represented in the current typed model.
- All three branches have weaker fallback identity paths when upstream IDs are absent, because fallback keys rely on descriptive fields and timestamps that may not be immutable across replay sources.

## Final Identity Verdict
- **Fee**: Same logical record = same workspace + same order + same upstream fee/transaction id (or weaker synthetic fallback when id missing).
- **OrderFulfillmentStatusEvent**: Same logical record = same workspace + same order + same upstream fulfillment event id (or weaker fallback of mapped status + source event instant).
- **OrderShippingLabelPurchase**: Same logical record = same workspace + same order + same upstream label id (or weaker fallback of purchase instant + carrier/service tuple).

Overall verdict: current code already encodes a practical identity strategy **implicitly** via marker IDs, but identity strength is uneven because fallback branches are weak and target-table uniqueness does not consistently enforce the same logical keys.
