# Focused Webhook Ingress Verification Matrix (Phase 2)

Date: 2026-04-03 (UTC)

Method:
- Static code verification of webhook ingress route, authenticity validation, workspace resolution, event-id validation, and dedupe behavior.
- Contract comparison against locked notes:
  - `WEBHOOK_INGRESS_MODEL.md`
  - `FINAL_WEBHOOK_PUBLIC_REQUEST_CONTRACT.md`
  - `WEBHOOK_WORKSPACE_RESOLUTION_STRATEGY.md`
  - `WEBHOOK_REFACTOR_ACCEPTANCE_CRITERIA.md`
- Attempted executable check via `node -r ts-node/register` simulation script for webhook scenarios; blocked by environment dependency/runtime issue (`@prisma/client-runtime-utils` missing).

## Verification Matrix

| # | Scenario | Expected | Actual | Pass/Fail | Evidence source |
|---|---|---|---|---|---|
| 1 | Shopify callback with missing HMAC | Rejected before ingestion | `verifyShopifyAuthenticity` requires `x-shopify-hmac-sha256` and throws `BadRequestException` before `webhookEvent.create` | Pass | `backend/src/connections/webhooks/webhook.service.ts` lines 47-50, 512-516, 529-541 |
| 2 | Shopify callback with invalid HMAC | Rejected before ingestion | Signature length/timing checks throw `Invalid Shopify webhook signature` before ingestion | Pass | `backend/src/connections/webhooks/webhook.service.ts` lines 56-72, 512-516, 529-541 |
| 3 | Shopify callback with valid HMAC but missing shop domain header | Rejected | Missing/invalid `x-shopify-shop-domain` throws before workspace resolution success | Pass | `backend/src/connections/webhooks/webhook.service.ts` lines 100-106, 121, 515-517 |
| 4 | Shopify callback with valid HMAC and invalid/non-myshopify domain | Rejected | Domain normalized with strict `*.myshopify.com` regex; invalid input rejected by same required-domain exception | Pass | `backend/src/connections/webhooks/webhook.service.ts` lines 90-96, 100-106 |
| 5 | Shopify callback with valid HMAC and no internal mapping | Rejected with unmapped workspace behavior | Empty mapping result throws `No workspace mapping found for verified Shopify webhook` and ingestion does not proceed | Pass | `backend/src/connections/webhooks/webhook.service.ts` lines 123-137, 159-162, 516-517 |
| 6 | Shopify callback with valid HMAC and ambiguous mapping | Rejected with ambiguous mapping behavior | Multiple matched workspaces throw `Shopify webhook workspace mapping is ambiguous` | Pass | `backend/src/connections/webhooks/webhook.service.ts` lines 138-166 |
| 7 | Shopify callback with valid HMAC, valid unique mapping but missing external event id | Rejected at event-id validation layer | Missing (`x-event-id`, `x-shopify-webhook-id`, `payload.id`) throws `Webhook missing external event id` | Pass | `backend/src/connections/webhooks/webhook.service.ts` lines 523-527 |
| 8 | Shopify callback with valid HMAC, valid unique mapping, valid event id | Accepted and ingested | Successful path creates webhook event, processes payload, marks processed, returns `{ stored: true, deduped: false }` | Pass | `backend/src/connections/webhooks/webhook.service.ts` lines 529-570 |
| 9 | Replay of same valid Shopify webhook | Explicit duplicate-safe success semantics | Unique-constraint (`P2002`) path returns success with `{ stored: false, deduped: true }` | Pass | `backend/src/connections/webhooks/webhook.service.ts` lines 571-580; contract line on duplicate success semantics in `FINAL_WEBHOOK_PUBLIC_REQUEST_CONTRACT.md` line 51 |
| 10 | WooCommerce callback | Rejected as not configured | Non-Shopify authenticity path throws `woocommerce webhook authenticity verification is not configured yet` | Pass | `backend/src/connections/webhooks/webhook.service.ts` lines 75-87 |
| 11 | Amazon callback | Rejected as not configured | Non-Shopify authenticity path throws `amazon webhook authenticity verification is not configured yet` | Pass | `backend/src/connections/webhooks/webhook.service.ts` lines 75-87 |

## Contract Alignment Notes

- Route remains `POST /webhooks/:platform` with platform restricted to `shopify|woocommerce|amazon`.
- Webhook path is exempt from `X-Workspace-Id` membership gating in `WorkspaceGuard` (`isWebhookIngressRoute` bypass).
- Global JWT middleware clears auth when absent/invalid and does not enforce JWT as ingress prerequisite.
- Workspace is derived from internal mapping after authenticity verification and never taken from request workspace header.

These match locked contract requirements for provider-native trust, internal workspace mapping, rejection of member-auth route assumptions, and duplicate-safe semantics.
