import { Injectable, NotFoundException } from '@nestjs/common';

export type ReportKey = 'sales-summary' | 'inventory-aging' | 'order-fulfillment-health';
export const reportPlatforms = [
  'shopify',
  'woocommerce',
  'amazon',
  'zoho',
  'xero',
  'sage',
  'odoo',
  'quickbooks',
] as const;

export type ReportPlatform = (typeof reportPlatforms)[number] | 'all';

export type DateRangePreset = 'last_7_days' | 'last_14_days' | 'last_30_days' | 'last_90_days';
export type OrderStatusOption = 'all' | 'open' | 'fulfilled' | 'cancelled';
export type RegionOption = 'all' | 'na' | 'eu' | 'apac';
export type AgingBucketOption = 'all' | '0_30' | '31_60' | '61_90' | '90_plus';

export type ReportFilterValueType = 'date-range' | 'select' | 'multi-select' | 'number' | 'text';

type ReportSelectOption = {
  value: string;
  label: string;
};

type BaseFilterField = {
  label: string;
  type: ReportFilterValueType;
  description?: string;
};

type DateRangeFilterField = BaseFilterField & {
  type: 'date-range';
  default: DateRangePreset;
  presets: DateRangePreset[];
};

type SelectFilterField = BaseFilterField & {
  type: 'select';
  default: string;
  options: ReportSelectOption[];
};

type MultiSelectFilterField = BaseFilterField & {
  type: 'multi-select';
  default: string[];
  options: ReportSelectOption[];
  maxSelections?: number;
};

type NumberFilterField = BaseFilterField & {
  type: 'number';
  default: number;
  min?: number;
  max?: number;
};

type TextFilterField = BaseFilterField & {
  type: 'text';
  default: string;
  minLength?: number;
  maxLength?: number;
};

export type ReportFilterFieldDefinition =
  | DateRangeFilterField
  | SelectFilterField
  | MultiSelectFilterField
  | NumberFilterField
  | TextFilterField;

export type ReportFilterDefinitionMap = Record<string, ReportFilterFieldDefinition>;

export const reportFilterDefinitionsByKey: Record<ReportKey, ReportFilterDefinitionMap> = {
  'sales-summary': {
    platform: {
      label: 'Platform',
      type: 'multi-select',
      description: 'Select one or more commerce platforms.',
      default: ['all'],
      options: [
        { value: 'all', label: 'All platforms' },
        { value: 'shopify', label: 'Shopify' },
        { value: 'woocommerce', label: 'WooCommerce' },
        { value: 'amazon', label: 'Amazon' },
        { value: 'zoho', label: 'Zoho' },
        { value: 'xero', label: 'Xero' },
        { value: 'sage', label: 'Sage' },
        { value: 'odoo', label: 'Odoo' },
        { value: 'quickbooks', label: 'QuickBooks' },
      ],
    },
    dateRange: {
      label: 'Date Range',
      type: 'date-range',
      default: 'last_30_days',
      presets: ['last_7_days', 'last_14_days', 'last_30_days', 'last_90_days'],
    },
    region: {
      label: 'Region',
      type: 'select',
      default: 'all',
      options: [
        { value: 'all', label: 'All regions' },
        { value: 'na', label: 'North America' },
        { value: 'eu', label: 'Europe' },
        { value: 'apac', label: 'APAC' },
      ],
    },
    statuses: {
      label: 'Statuses',
      type: 'multi-select',
      description: 'Choose one or more order statuses to include.',
      default: ['all'],
      options: [
        { value: 'all', label: 'All statuses' },
        { value: 'open', label: 'Open' },
        { value: 'fulfilled', label: 'Fulfilled' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
      maxSelections: 4,
    },
    minRevenue: {
      label: 'Minimum Revenue',
      type: 'number',
      default: 0,
      min: 0,
      max: 1_000_000,
    },
    searchTerm: {
      label: 'Search term',
      type: 'text',
      default: '',
      minLength: 0,
      maxLength: 60,
    },
  },
  'inventory-aging': {
    platform: {
      label: 'Platform',
      type: 'multi-select',
      description: 'Select one or more commerce platforms.',
      default: ['all'],
      options: [
        { value: 'all', label: 'All platforms' },
        { value: 'shopify', label: 'Shopify' },
        { value: 'woocommerce', label: 'WooCommerce' },
        { value: 'amazon', label: 'Amazon' },
        { value: 'zoho', label: 'Zoho' },
        { value: 'xero', label: 'Xero' },
        { value: 'sage', label: 'Sage' },
        { value: 'odoo', label: 'Odoo' },
        { value: 'quickbooks', label: 'QuickBooks' },
      ],
    },
    dateRange: {
      label: 'Date Range',
      type: 'date-range',
      default: 'last_90_days',
      presets: ['last_30_days', 'last_90_days'],
    },
    region: {
      label: 'Region',
      type: 'select',
      default: 'all',
      options: [
        { value: 'all', label: 'All regions' },
        { value: 'na', label: 'North America' },
        { value: 'eu', label: 'Europe' },
        { value: 'apac', label: 'APAC' },
      ],
    },
    agingBuckets: {
      label: 'Aging buckets',
      type: 'multi-select',
      default: ['all'],
      options: [
        { value: 'all', label: 'All buckets' },
        { value: '0_30', label: '0-30 days' },
        { value: '31_60', label: '31-60 days' },
        { value: '61_90', label: '61-90 days' },
        { value: '90_plus', label: '90+ days' },
      ],
      maxSelections: 5,
    },
    minOnHand: {
      label: 'Minimum on-hand qty',
      type: 'number',
      default: 0,
      min: 0,
      max: 200_000,
    },
    skuContains: {
      label: 'SKU contains',
      type: 'text',
      default: '',
      minLength: 0,
      maxLength: 40,
    },
  },
  'order-fulfillment-health': {
    platform: {
      label: 'Platform',
      type: 'multi-select',
      description: 'Select one or more commerce platforms.',
      default: ['all'],
      options: [
        { value: 'all', label: 'All platforms' },
        { value: 'shopify', label: 'Shopify' },
        { value: 'woocommerce', label: 'WooCommerce' },
        { value: 'amazon', label: 'Amazon' },
        { value: 'zoho', label: 'Zoho' },
        { value: 'xero', label: 'Xero' },
        { value: 'sage', label: 'Sage' },
        { value: 'odoo', label: 'Odoo' },
        { value: 'quickbooks', label: 'QuickBooks' },
      ],
    },
    dateRange: {
      label: 'Date Range',
      type: 'date-range',
      default: 'last_14_days',
      presets: ['last_7_days', 'last_14_days', 'last_30_days'],
    },
    region: {
      label: 'Region',
      type: 'select',
      default: 'all',
      options: [
        { value: 'all', label: 'All regions' },
        { value: 'na', label: 'North America' },
        { value: 'eu', label: 'Europe' },
        { value: 'apac', label: 'APAC' },
      ],
    },
    statuses: {
      label: 'Statuses',
      type: 'multi-select',
      default: ['open'],
      options: [
        { value: 'all', label: 'All statuses' },
        { value: 'open', label: 'Open' },
        { value: 'fulfilled', label: 'Fulfilled' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
      maxSelections: 4,
    },
    maxLateShipRate: {
      label: 'Max late ship rate %',
      type: 'number',
      default: 15,
      min: 0,
      max: 100,
    },
    carrierQuery: {
      label: 'Carrier contains',
      type: 'text',
      default: '',
      minLength: 0,
      maxLength: 40,
    },
  },
};

export type ReportFiltersByKey = {
  'sales-summary': {
    platform: ReportPlatform[];
    dateRange: DateRangePreset;
    region: RegionOption;
    statuses: OrderStatusOption[];
    minRevenue: number;
    searchTerm: string;
  };
  'inventory-aging': {
    platform: ReportPlatform[];
    dateRange: Extract<DateRangePreset, 'last_30_days' | 'last_90_days'>;
    region: RegionOption;
    agingBuckets: AgingBucketOption[];
    minOnHand: number;
    skuContains: string;
  };
  'order-fulfillment-health': {
    platform: ReportPlatform[];
    dateRange: Extract<DateRangePreset, 'last_7_days' | 'last_14_days' | 'last_30_days'>;
    region: RegionOption;
    statuses: OrderStatusOption[];
    maxLateShipRate: number;
    carrierQuery: string;
  };
};

export type ReportDefinition = {
  key: ReportKey;
  label: string;
  defaultFilters: ReportFiltersByKey[ReportKey];
  filterDefinitions: ReportFilterDefinitionMap;
  supportedPlatforms: ReportPlatform[];
  supportsExport: boolean;
};

type ReportRunRecord = {
  id: string;
  workspaceId: string;
  reportKey: ReportKey;
  filters: ReportFiltersByKey[ReportKey];
  status: 'completed';
  output: {
    rows: number;
    summary: string;
    generatedAt: string;
  };
  createdAt: Date;
};

type RunReportInput<K extends ReportKey = ReportKey> = {
  workspaceId: string;
  key: K;
  filters?: Partial<ReportFiltersByKey[K]>;
};

type GetReportRunInput = {
  workspaceId: string;
  key: string;
  runId: string;
};

@Injectable()
export class ReportsService {
  private readonly reports: ReportDefinition[] = [
    {
      key: 'sales-summary',
      label: 'Sales Summary',
      defaultFilters: {
        platform: ['all'],
        dateRange: 'last_30_days',
        region: 'all',
        statuses: ['all'],
        minRevenue: 0,
        searchTerm: '',
      },
      filterDefinitions: reportFilterDefinitionsByKey['sales-summary'],
      supportedPlatforms: ['all'],
      supportsExport: true,
    },
    {
      key: 'inventory-aging',
      label: 'Inventory Aging',
      defaultFilters: {
        platform: ['all'],
        dateRange: 'last_90_days',
        region: 'all',
        agingBuckets: ['all'],
        minOnHand: 0,
        skuContains: '',
      },
      filterDefinitions: reportFilterDefinitionsByKey['inventory-aging'],
      supportedPlatforms: ['shopify', 'amazon', 'woocommerce'],
      supportsExport: true,
    },
    {
      key: 'order-fulfillment-health',
      label: 'Order Fulfillment Health',
      defaultFilters: {
        platform: ['all'],
        dateRange: 'last_14_days',
        region: 'all',
        statuses: ['open'],
        maxLateShipRate: 15,
        carrierQuery: '',
      },
      filterDefinitions: reportFilterDefinitionsByKey['order-fulfillment-health'],
      supportedPlatforms: ['all'],
      supportsExport: false,
    },
  ];

  private readonly runsByWorkspace = new Map<string, ReportRunRecord[]>();

  listReports() {
    return this.reports;
  }

  hasReportKey(key: string): key is ReportKey {
    return this.reports.some((item) => item.key === key);
  }

  getFilterDefinitionMap<K extends ReportKey>(key: K) {
    return reportFilterDefinitionsByKey[key];
  }

  runReport<K extends ReportKey>(input: RunReportInput<K>) {
    const report = this.reports.find((item) => item.key === input.key);

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const normalizedFilters = {
      ...report.defaultFilters,
      ...(input.filters ?? {}),
    } as ReportFiltersByKey[K];
    const normalizedPlatformFilters = this.normalizePlatformFilter(report.key, normalizedFilters.platform);
    normalizedFilters.platform = normalizedPlatformFilters as ReportFiltersByKey[K]['platform'];

    const run: ReportRunRecord = {
      id: `run_${Date.now().toString(36)}`,
      workspaceId: input.workspaceId,
      reportKey: report.key,
      filters: normalizedFilters,
      status: 'completed',
      output: {
        rows: this.estimateRowsForReport(report.key, normalizedFilters),
        summary: `${report.label} generated for ${normalizedFilters.dateRange}`,
        generatedAt: new Date().toISOString(),
      },
      createdAt: new Date(),
    };

    const existingRuns = this.runsByWorkspace.get(input.workspaceId) ?? [];
    this.runsByWorkspace.set(input.workspaceId, [run, ...existingRuns]);

    return {
      id: run.id,
      reportKey: run.reportKey,
      status: run.status,
      filters: run.filters,
      output: run.output,
      createdAt: run.createdAt.toISOString(),
    };
  }

  getRun(input: GetReportRunInput) {
    const report = this.reports.find((item) => item.key === input.key);

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const run = (this.runsByWorkspace.get(input.workspaceId) ?? []).find(
      (item) => item.id === input.runId && item.reportKey === report.key,
    );

    if (!run) {
      throw new NotFoundException('Report run not found');
    }

    return {
      id: run.id,
      reportKey: run.reportKey,
      status: run.status,
      filters: run.filters,
      output: run.output,
      createdAt: run.createdAt.toISOString(),
    };
  }

  private estimateRowsForReport(key: ReportKey, filters: ReportFiltersByKey[ReportKey]): number {
    const platformMatchRatio = this.getPlatformMatchRatio(key, filters.platform);

    switch (key) {
      case 'sales-summary': {
        const typedFilters = filters as ReportFiltersByKey['sales-summary'];
        if (typedFilters.searchTerm.toLowerCase() === 'no-results') {
          return 0;
        }

        return typedFilters.minRevenue > 100_000 ? 0 : Math.round(48 * platformMatchRatio);
      }
      case 'inventory-aging': {
        const typedFilters = filters as ReportFiltersByKey['inventory-aging'];
        if (typedFilters.skuContains.toLowerCase() === 'no-results') {
          return 0;
        }

        return typedFilters.minOnHand > 25_000 ? 0 : Math.round(112 * platformMatchRatio);
      }
      case 'order-fulfillment-health': {
        const typedFilters = filters as ReportFiltersByKey['order-fulfillment-health'];
        if (typedFilters.carrierQuery.toLowerCase() === 'no-results') {
          return 0;
        }

        return typedFilters.maxLateShipRate < 3 ? 0 : Math.round(32 * platformMatchRatio);
      }
      default:
        return 0;
    }
  }

  private normalizePlatformFilter(key: ReportKey, rawValue: ReportPlatform[] | ReportPlatform): ReportPlatform[] {
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    const normalized = Array.from(new Set(values.map((value) => value.toLowerCase() as ReportPlatform)));
    const selectedValues: ReportPlatform[] = normalized.length > 0 ? normalized : ['all'];
    if (selectedValues.includes('all')) {
      return ['all'];
    }

    const report = this.reports.find((item) => item.key === key);
    if (!report) {
      return ['all'];
    }

    const available = report.supportedPlatforms.includes('all')
      ? reportPlatforms
      : report.supportedPlatforms.filter((platform) => platform !== 'all');
    const availableSet = new Set<ReportPlatform>(available);

    const filtered = selectedValues.filter((platform) => platform !== 'all' && availableSet.has(platform));

    return filtered.length > 0 ? filtered : ['all'];
  }

  private getPlatformMatchRatio(key: ReportKey, selectedPlatforms: ReportPlatform[]): number {
    const report = this.reports.find((item) => item.key === key);
    if (!report || selectedPlatforms.includes('all')) {
      return 1;
    }

    const reportSupportedPlatforms = report.supportedPlatforms.includes('all')
      ? reportPlatforms
      : report.supportedPlatforms.filter((platform) => platform !== 'all');
    const platformMatches = reportSupportedPlatforms.filter((platform) => selectedPlatforms.includes(platform));

    /**
     * Report-to-data mapping by query builder:
     * - sales-summary: order.channel, order.platform, order.connection.platform all map to connection platform.
     * - inventory-aging: inventory_snapshot.channel and inventory_snapshot.platform map to connection platform.
     * - order-fulfillment-health: fulfillment_order.channel, fulfillment_order.platform, and order.platform map to connection platform.
     *
     * Each report query builder applies the platform predicate to every mapped field above to avoid
     * inconsistent filtering across order/channel/platform source columns.
     */
    return platformMatches.length > 0 ? platformMatches.length / reportSupportedPlatforms.length : 0;
  }
}
