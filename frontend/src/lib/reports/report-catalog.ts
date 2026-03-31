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

export type ReportPlatform = 'shopify' | 'amazon' | 'woocommerce' | 'all'

export interface ReportDefinition {
  key: ReportKey
  label: string
  description: string
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
    defaultFilters: {
      dateRange: 'last_90_days',
      region: 'all',
      status: 'all',
    },
    supportedPlatforms: ['all'],
    supportsExport: true,
  },
]

export const reportCatalogByKey: Record<ReportKey, ReportDefinition> = reportCatalog.reduce(
  (acc, report) => {
    acc[report.key] = report
    return acc
  },
  {} as Record<ReportKey, ReportDefinition>,
)
