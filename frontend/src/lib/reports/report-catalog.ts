export type ReportKey = 'sales-summary' | 'inventory-aging' | 'order-fulfillment-health'

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
]

export const reportCatalogByKey: Record<ReportKey, ReportDefinition> = reportCatalog.reduce(
  (acc, report) => {
    acc[report.key] = report
    return acc
  },
  {} as Record<ReportKey, ReportDefinition>,
)
