export type ReportKey =
  | 'sales-summary'
  | 'inventory-aging'
  | 'order-fulfillment-health'
  | 'orders-reversals-by-product'
  | 'orders-over-time'
  | 'shipping-delivery-performance'
  | 'orders-fulfilled-over-time'
  | 'shipping-labels-over-time'
  | 'shipping-labels-by-order'
  | 'items-bought-together'
  | 'sessions-acquisition-overview'
  | 'conversion-funnel-storefront-events'
  | 'shopify-fraud-internals'
  | 'shopify-protect-internals'
  | 'core-web-vitals-without-rum-connector'

export type ReportPlatform = 'shopify' | 'amazon' | 'woocommerce' | 'all'

export type ReportDomain =
  | 'transactional'
  | 'finance'
  | 'inventory'
  | 'fulfillment'
  | 'customer'
  | 'attribution'
  | 'behavior'
  | 'fraud'
  | 'feature-specific'

export type ReportSupportStatus = 'supported' | 'partial' | 'unsupported'

export type ReportBlockerClassification =
  | 'none'
  | 'not-implemented'
  | 'missing-input-data'
  | 'needs-separate-tracking-system'
  | 'needs-additional-connector-expansion'
  | 'shopify-scope-only'
  | 'deprecated'
  | 'not-documented'

export interface ReportDefinition {
  key: ReportKey
  label: string
  description: string
  domain: ReportDomain
  supportStatus: ReportSupportStatus
  requiredCapabilities: string[]
  blockerClassification: ReportBlockerClassification
  defaultFilters: {
    dateRange: string
    region: string
    status: string
  }
  supportedPlatforms: ReportPlatform[]
  supportsExport: boolean
}

export const reportCatalog: ReportDefinition[] = [
  {
    key: 'sales-summary',
    label: 'Sales Summary',
    description: 'Revenue, order volume, and channel contribution over a selected time period.',
    domain: 'finance',
    supportStatus: 'unsupported',
    requiredCapabilities: ['orders'],
    blockerClassification: 'not-implemented',
    defaultFilters: {
      dateRange: 'last_30_days',
      region: 'all',
      status: 'all',
    },
    supportedPlatforms: ['all'],
    supportsExport: true,
  },
  {
    key: 'inventory-aging',
    label: 'Inventory Aging',
    description: 'On-hand inventory grouped by aging buckets to identify at-risk stock.',
    domain: 'inventory',
    supportStatus: 'unsupported',
    requiredCapabilities: ['inventory_levels', 'orders'],
    blockerClassification: 'not-implemented',
    defaultFilters: {
      dateRange: 'last_90_days',
      region: 'all',
      status: 'active',
    },
    supportedPlatforms: ['shopify', 'amazon', 'woocommerce'],
    supportsExport: true,
  },
  {
    key: 'order-fulfillment-health',
    label: 'Order Fulfillment Health',
    description: 'Fill-rate, late shipment counts, and average pick-pack-ship cycle time.',
    domain: 'fulfillment',
    supportStatus: 'unsupported',
    requiredCapabilities: ['fulfillments', 'shipments', 'orders'],
    blockerClassification: 'not-implemented',
    defaultFilters: {
      dateRange: 'last_14_days',
      region: 'all',
      status: 'open',
    },
    supportedPlatforms: ['all'],
    supportsExport: false,
  },
  {
    key: 'orders-reversals-by-product',
    label: 'Orders Reversals by Product',
    description: 'Cancelled and reversed orders grouped by product to identify return-prone catalog items.',
    domain: 'transactional',
    supportStatus: 'supported',
    requiredCapabilities: ['orders', 'order_items', 'refunds'],
    blockerClassification: 'none',
    defaultFilters: {
      dateRange: 'last_30_days',
      region: 'all',
      status: 'cancelled',
    },
    supportedPlatforms: ['all'],
    supportsExport: true,
  },
  {
    key: 'orders-over-time',
    label: 'Orders Over Time',
    description: 'Order volume trends over time with daily and weekly trajectory views.',
    domain: 'transactional',
    supportStatus: 'supported',
    requiredCapabilities: ['orders', 'order_items'],
    blockerClassification: 'none',
    defaultFilters: {
      dateRange: 'last_30_days',
      region: 'all',
      status: 'all',
    },
    supportedPlatforms: ['all'],
    supportsExport: true,
  },
  {
    key: 'shipping-delivery-performance',
    label: 'Shipping Delivery Performance',
    description: 'Carrier delivery speed and on-time performance across recent shipments.',
    domain: 'fulfillment',
    supportStatus: 'supported',
    requiredCapabilities: ['orders', 'fulfillments', 'shipments'],
    blockerClassification: 'none',
    defaultFilters: {
      dateRange: 'last_14_days',
      region: 'all',
      status: 'all',
    },
    supportedPlatforms: ['shopify', 'amazon', 'woocommerce'],
    supportsExport: true,
  },
  {
    key: 'orders-fulfilled-over-time',
    label: 'Orders Fulfilled Over Time',
    description: 'Completed fulfillment volumes over time for throughput and capacity planning.',
    domain: 'fulfillment',
    supportStatus: 'supported',
    requiredCapabilities: ['orders', 'fulfillments'],
    blockerClassification: 'none',
    defaultFilters: {
      dateRange: 'last_30_days',
      region: 'all',
      status: 'fulfilled',
    },
    supportedPlatforms: ['all'],
    supportsExport: true,
  },
  {
    key: 'shipping-labels-over-time',
    label: 'Shipping Labels Over Time',
    description: 'Shipping label creation volume by date to track dispatch operations.',
    domain: 'fulfillment',
    supportStatus: 'supported',
    requiredCapabilities: ['orders', 'shipping_labels'],
    blockerClassification: 'none',
    defaultFilters: {
      dateRange: 'last_30_days',
      region: 'all',
      status: 'all',
    },
    supportedPlatforms: ['shopify', 'amazon', 'woocommerce'],
    supportsExport: true,
  },
  {
    key: 'shipping-labels-by-order',
    label: 'Shipping Labels by Order',
    description: 'Per-order label generation activity with shipment-level detail.',
    domain: 'fulfillment',
    supportStatus: 'supported',
    requiredCapabilities: ['orders', 'shipping_labels'],
    blockerClassification: 'none',
    defaultFilters: {
      dateRange: 'last_30_days',
      region: 'all',
      status: 'all',
    },
    supportedPlatforms: ['shopify', 'amazon', 'woocommerce'],
    supportsExport: true,
  },
  {
    key: 'items-bought-together',
    label: 'Items Bought Together',
    description: 'Frequently co-purchased item combinations for bundle and merchandising decisions.',
    domain: 'feature-specific',
    supportStatus: 'partial',
    requiredCapabilities: ['orders', 'order_items', 'variant_ids'],
    blockerClassification: 'missing-input-data',
    defaultFilters: {
      dateRange: 'last_90_days',
      region: 'all',
      status: 'all',
    },
    supportedPlatforms: ['all'],
    supportsExport: true,
  },
  {
    key: 'sessions-acquisition-overview',
    label: 'Sessions Acquisition Overview',
    description: 'Acquisition sessions trend report that requires dedicated session tracking infrastructure.',
    domain: 'attribution',
    supportStatus: 'unsupported',
    requiredCapabilities: ['session_tracking'],
    blockerClassification: 'needs-separate-tracking-system',
    defaultFilters: {
      dateRange: 'last_30_days',
      region: 'all',
      status: 'all',
    },
    supportedPlatforms: ['all'],
    supportsExport: false,
  },
  {
    key: 'conversion-funnel-storefront-events',
    label: 'Conversion Funnel (Storefront Events)',
    description: 'Storefront funnel stages from visit to checkout completion using storefront event streams.',
    domain: 'behavior',
    supportStatus: 'unsupported',
    requiredCapabilities: ['storefront_events', 'checkout_events'],
    blockerClassification: 'needs-additional-connector-expansion',
    defaultFilters: {
      dateRange: 'last_30_days',
      region: 'all',
      status: 'all',
    },
    supportedPlatforms: ['shopify'],
    supportsExport: false,
  },
  {
    key: 'shopify-fraud-internals',
    label: 'Shopify Fraud Internals',
    description: 'Internal Shopify fraud signal report that is not exposed through public connector APIs.',
    domain: 'fraud',
    supportStatus: 'unsupported',
    requiredCapabilities: ['shopify_fraud_internals'],
    blockerClassification: 'needs-additional-connector-expansion',
    defaultFilters: {
      dateRange: 'last_30_days',
      region: 'all',
      status: 'all',
    },
    supportedPlatforms: ['shopify'],
    supportsExport: false,
  },
  {
    key: 'shopify-protect-internals',
    label: 'Shopify Protect Internals',
    description: 'Internal Shopify Protect coverage report that is not exposed via current public APIs.',
    domain: 'fraud',
    supportStatus: 'unsupported',
    requiredCapabilities: ['shopify_protect_internals'],
    blockerClassification: 'needs-additional-connector-expansion',
    defaultFilters: {
      dateRange: 'last_30_days',
      region: 'all',
      status: 'all',
    },
    supportedPlatforms: ['shopify'],
    supportsExport: false,
  },
  {
    key: 'core-web-vitals-without-rum-connector',
    label: 'Core Web Vitals (No RUM Connector)',
    description: 'Core Web Vitals diagnostics require a Real User Monitoring connector that is not configured.',
    domain: 'behavior',
    supportStatus: 'unsupported',
    requiredCapabilities: ['core_web_vitals_rum'],
    blockerClassification: 'needs-separate-tracking-system',
    defaultFilters: {
      dateRange: 'last_30_days',
      region: 'all',
      status: 'all',
    },
    supportedPlatforms: ['all'],
    supportsExport: false,
  },
]

export const reportCatalogByKey: Record<ReportKey, ReportDefinition> = reportCatalog.reduce(
  (acc, report) => {
    acc[report.key] = report
    return acc
  },
  {} as Record<ReportKey, ReportDefinition>,
)
