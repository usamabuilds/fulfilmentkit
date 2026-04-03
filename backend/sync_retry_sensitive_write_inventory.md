# Sync Retry-Sensitive Write Inventory

## Grounding
- Source path reviewed: `POST /connections/:id/sync` → `ConnectionsService.triggerManualSync` producer → BullMQ `sync:run_connection` consumer in `ConnectionSyncWorker.process`.
- Retry semantics verified from queue options (`attempts: 5`, exponential backoff, failed jobs retained).
- Downstream write branches reviewed only within this job flow (historical order ingest + markering + inventory snapshot + run/connection status writes).

## sync:run_connection Execution Path
1. Producer enqueues `sync:run_connection` with payload `{ workspaceId, connectionId, syncRunId, idempotencyKey }`.
2. Worker validates job payload and verifies `SyncRun` and `Connection` ownership.
3. Worker marks `SyncRun` RUNNING.
4. If platform is SHOPIFY and `historicalOrders` exists, worker ingests each historical order:
   - customer resolution
   - order upsert
   - contextual hook ingestion (payment/gateway fees, tax/risk/POS/bundle markers)
   - fulfillment timeline events
   - shipping label purchases
5. Worker upserts daily inventory snapshot rows.
6. Worker marks `SyncRun` SUCCESS and updates connection `lastSyncAt`.
7. On error, worker marks `SyncRun` FAILED and updates connection `lastError`, then rethrows for retry.

## Naturally Safe Writes
- `syncRun.update` status transitions (RUNNING/SUCCESS/FAILED).
- `connection.update` for `lastSyncAt` / `lastError`.

## DB-Uniqueness-Protected Writes
- `customer.upsert` by `(workspaceId, externalId)` or `(workspaceId, emailCanonical)`.
- `order.upsert` by `(workspaceId, externalRef)`.
- `inventorySnapshot.upsert` by `(workspaceId, locationId, productId, day)`.
- `webhookEvent.create` guarded by DB unique `(workspaceId, platform, externalEventId)` and explicit P2002 handling.

## Logic-Dedupe-Protected Writes
- `fee.create` executes only when `createDataAvailabilityMarker(...)` returns true.
- `orderFulfillmentStatusEvent.create` executes only when marker create succeeds.
- `orderShippingLabelPurchase.create` executes only when marker create succeeds.

Notes:
- Marker-first gating prevents duplicate create on replay if prior marker exists.
- Marker-first gating is not equivalent to exactly-once delivery of target writes (marker can exist while target write is absent after mid-branch failure).

## Create-Only Retry-Sensitive Writes
- `fee.create` (table `Fee`): create-only; replay reaches branch again; dedupe depends on marker and not Fee-table uniqueness.
- `orderFulfillmentStatusEvent.create` (table `OrderFulfillmentStatusEvent`): create-only; replay reaches branch again; dedupe depends on marker and not event-table uniqueness.
- `orderShippingLabelPurchase.create` (table `OrderShippingLabelPurchase`): create-only; replay reaches branch again; dedupe depends on marker and not label-table uniqueness.

## Unclear or Later-Proof Areas
- No dedicated uniqueness on `Fee`, `OrderFulfillmentStatusEvent`, or `OrderShippingLabelPurchase` for sync-derived identity keys.
- Marker-first pattern appears intentionally at-most-once for branch writes; requires later proof/decision for loss-vs-duplication tradeoff.
- `historicalOrders` is optional in worker payload but not currently included by the producer; replay sensitivity of create-only branches therefore depends on external enqueuers/tests that do supply it.

## Final Inventory Verdict
The sync worker path has three create-only business tables (`Fee`, `OrderFulfillmentStatusEvent`, `OrderShippingLabelPurchase`) that are replay-reachable and protected only by logic-level marker dedupe (via `WebhookEvent` uniqueness), not by target-table uniqueness. They are the primary retry-sensitive create-only writes for idempotency hardening.
