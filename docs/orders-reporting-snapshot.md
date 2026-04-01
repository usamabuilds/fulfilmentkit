# Orders Reporting Snapshot (Dev Notes)

Operational snapshot of currently wired reporting keys and dashboard/report endpoint bindings.

## Report keys and implementation status

Source of truth: `OrdersReportsService.reports` in `backend/src/orders/reporting/orders-reports.service.ts`.

| Report key | Status | Classification | Concrete reason |
| --- | --- | --- | --- |
| `inventory-aging` | implemented | supported | Backed by `InventoryReportsService` and currently runnable. |
| `orders-reversals-by-product` | implemented | supported | Backed by `OrdersTransactionalReportsService` and currently runnable. |
| `orders-over-time` | implemented | supported | Backed by `OrdersTransactionalReportsService` and currently runnable. |
| `shipping-delivery-performance` | implemented | supported | Backed by `FulfillmentReportsService` and currently runnable. |
| `orders-fulfilled-over-time` | implemented | supported | Backed by `FulfillmentReportsService` and currently runnable. |
| `shipping-labels-over-time` | implemented | supported | Backed by `FulfillmentReportsService` and currently runnable. |
| `shipping-labels-by-order` | implemented | supported | Backed by `FulfillmentReportsService` and currently runnable. |
| `new-vs-returning-customers` | implemented | supported | Backed by `CustomerReportsService` and currently runnable. |
| `customer-cohort-analysis` | implemented | supported | Backed by `CustomerReportsService` and currently runnable. |
| `rfm-customer-analysis` | implemented | supported | Backed by `CustomerReportsService` and currently runnable. |
| `rfm-customer-list` | implemented | supported | Backed by `CustomerReportsService` and currently runnable. |
| `items-bought-together` | partial | partial | Missing data model field: variant grouping mode is unavailable because order item variant identifiers are not in the current schema. |
| `sales-summary` | unsupported | unsupported | Intentionally not implemented yet (placeholder run with no computed rows). |
| `order-fulfillment-health` | unsupported | unsupported | Intentionally not implemented yet (placeholder run with no computed rows). |
| `predicted-spend-tier` | unsupported | unsupported | Intentionally out-of-scope for current reporting modules: requires ML inference model + feature pipeline not present in this stack. |

## Dashboard widget → report mapping and source endpoints

### Dashboard widgets backed by reporting module

All snapshot report widgets load definitions from `GET /orders/reports` and run data from `POST /orders/reports/:key/run`.

| Dashboard widget (UI label) | Report key | Definition endpoint | Run endpoint |
| --- | --- | --- | --- |
| Orders Over Time | `orders-over-time` | `GET /orders/reports` | `POST /orders/reports/orders-over-time/run` |
| Shipping Delivery Performance | `shipping-delivery-performance` | `GET /orders/reports` | `POST /orders/reports/shipping-delivery-performance/run` |
| Fulfilled Orders Trend | `orders-fulfilled-over-time` | `GET /orders/reports` | `POST /orders/reports/orders-fulfilled-over-time/run` |
| Top Reversed Products | `orders-reversals-by-product` | `GET /orders/reports` | `POST /orders/reports/orders-reversals-by-product/run` |

### Dashboard widgets not backed by reporting module

| Dashboard widget family | Source endpoint(s) |
| --- | --- |
| KPI stat cards (Revenue, Orders, Units, etc.) | `GET /dashboard/summary` |
| Alert cards | `GET /dashboard/alerts` |
| Recent orders table | `GET /orders` |

## Explicit non-goals

- No Shopify-only session/fraud internals in current operational reporting scope.
  - Examples intentionally outside this stack: Shopify internal fraud/session signals that are not exposed via current connector capabilities.
- No parallel analytics pipeline outside reporting modules.
  - New reporting output must remain in existing reporting/dashboard modules; do not introduce a separate analytics ingestion or compute plane for these keys.
