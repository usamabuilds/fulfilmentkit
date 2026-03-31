import { Injectable, NotFoundException } from '@nestjs/common';
import {
  buildMetadataEntries as buildReportMetadataEntries,
  buildWorkbookXml as buildReportWorkbookXml,
  formatFileNameTimestamp as formatReportFileNameTimestamp,
} from './report-export.builder';
import { normalizePlatformFilter as normalizeReportPlatformFilter } from './report-platform.utils';
import { FinanceReportsService } from '../../reports/finance/finance-reports.service';
import { FulfillmentReportsService } from '../../reports/fulfillment/fulfillment-reports.service';
import { InventoryReportsService } from '../../reports/inventory/inventory-reports.service';
import { OrdersTransactionalReportsService } from '../../reports/orders/orders-transactional-reports.service';

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
  | 'items-bought-together';
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
export type TimeGroupingOption = 'hour' | 'day' | 'week' | 'month';
export type OrderStatusOption = 'all' | 'open' | 'fulfilled' | 'cancelled';
export type RegionOption = 'all' | 'na' | 'eu' | 'apac';
export type AgingBucketOption = 'all' | '0_30' | '31_60' | '61_90' | '90_plus';
export type CombinationSizeOption = '2' | '3';
export type ItemGroupingLevelOption = 'product' | 'variant';

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
  'orders-reversals-by-product': {
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
      default: ['cancelled'],
      options: [
        { value: 'all', label: 'All statuses' },
        { value: 'open', label: 'Open' },
        { value: 'fulfilled', label: 'Fulfilled' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
      maxSelections: 4,
    },
  },
  'orders-over-time': {
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
    groupBy: {
      label: 'Group by',
      type: 'select',
      default: 'day',
      options: [
        { value: 'hour', label: 'Hour' },
        { value: 'day', label: 'Day' },
        { value: 'week', label: 'Week' },
        { value: 'month', label: 'Month' },
      ],
    },
  },
  'shipping-delivery-performance': {
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
    carrierQuery: {
      label: 'Carrier contains',
      type: 'text',
      default: '',
      minLength: 0,
      maxLength: 80,
    },
    serviceQuery: {
      label: 'Service contains',
      type: 'text',
      default: '',
      minLength: 0,
      maxLength: 80,
    },
    locationQuery: {
      label: 'Location contains',
      type: 'text',
      default: '',
      minLength: 0,
      maxLength: 80,
    },
  },
  'orders-fulfilled-over-time': {
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
      default: ['fulfilled'],
      options: [
        { value: 'all', label: 'All statuses' },
        { value: 'open', label: 'Open' },
        { value: 'fulfilled', label: 'Fulfilled' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
      maxSelections: 4,
    },
    carrierQuery: {
      label: 'Carrier contains',
      type: 'text',
      default: '',
      minLength: 0,
      maxLength: 80,
    },
    serviceQuery: {
      label: 'Service contains',
      type: 'text',
      default: '',
      minLength: 0,
      maxLength: 80,
    },
    locationQuery: {
      label: 'Location contains',
      type: 'text',
      default: '',
      minLength: 0,
      maxLength: 80,
    },
  },
  'shipping-labels-over-time': {
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
    carrierQuery: {
      label: 'Carrier contains',
      type: 'text',
      default: '',
      minLength: 0,
      maxLength: 80,
    },
    serviceQuery: {
      label: 'Service contains',
      type: 'text',
      default: '',
      minLength: 0,
      maxLength: 80,
    },
    locationQuery: {
      label: 'Location contains',
      type: 'text',
      default: '',
      minLength: 0,
      maxLength: 80,
    },
  },
  'shipping-labels-by-order': {
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
    carrierQuery: {
      label: 'Carrier contains',
      type: 'text',
      default: '',
      minLength: 0,
      maxLength: 80,
    },
    serviceQuery: {
      label: 'Service contains',
      type: 'text',
      default: '',
      minLength: 0,
      maxLength: 80,
    },
    locationQuery: {
      label: 'Location contains',
      type: 'text',
      default: '',
      minLength: 0,
      maxLength: 80,
    },
  },
  'items-bought-together': {
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
    combinationSize: {
      label: 'Combination size',
      type: 'select',
      default: '2',
      options: [
        { value: '2', label: 'Pairs (2 items)' },
        { value: '3', label: 'Triples (3 items)' },
      ],
    },
    itemGroupingLevel: {
      label: 'Grouping level',
      type: 'select',
      default: 'product',
      options: [
        { value: 'product', label: 'Product' },
        { value: 'variant', label: 'Variant (unsupported)' },
      ],
    },
    topN: {
      label: 'Top combinations',
      type: 'number',
      default: 10,
      min: 1,
      max: 100,
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
  'orders-reversals-by-product': {
    platform: ReportPlatform[];
    dateRange: DateRangePreset;
    region: RegionOption;
    statuses: OrderStatusOption[];
  };
  'orders-over-time': {
    platform: ReportPlatform[];
    dateRange: DateRangePreset;
    region: RegionOption;
    groupBy: TimeGroupingOption;
  };
  'shipping-delivery-performance': {
    platform: ReportPlatform[];
    dateRange: DateRangePreset;
    region: RegionOption;
    carrierQuery: string;
    serviceQuery: string;
    locationQuery: string;
  };
  'orders-fulfilled-over-time': {
    platform: ReportPlatform[];
    dateRange: DateRangePreset;
    region: RegionOption;
    statuses: OrderStatusOption[];
    carrierQuery: string;
    serviceQuery: string;
    locationQuery: string;
  };
  'shipping-labels-over-time': {
    platform: ReportPlatform[];
    dateRange: DateRangePreset;
    region: RegionOption;
    carrierQuery: string;
    serviceQuery: string;
    locationQuery: string;
  };
  'shipping-labels-by-order': {
    platform: ReportPlatform[];
    dateRange: DateRangePreset;
    region: RegionOption;
    carrierQuery: string;
    serviceQuery: string;
    locationQuery: string;
  };
  'items-bought-together': {
    platform: ReportPlatform[];
    dateRange: Extract<DateRangePreset, 'last_30_days' | 'last_90_days'>;
    region: RegionOption;
    combinationSize: CombinationSizeOption;
    itemGroupingLevel: ItemGroupingLevelOption;
    topN: number;
  };
};

export type ReportDefinition = {
  key: ReportKey;
  label: string;
  supportStatus: 'supported' | 'partial' | 'unsupported';
  supportReason?: string;
  requiredFeatures?: string[];
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
    caveat?: string;
    warnings?: string[];
    chartRows?: Array<Record<string, string | number | null>>;
    supportStatus: 'supported' | 'partial' | 'unsupported';
    supportReason?: string;
    generatedAt: string;
  };
  createdAt: Date;
};

type RunReportInput<K extends ReportKey = ReportKey> = {
  workspaceId: string;
  key: K;
  filters?: Partial<ReportFiltersByKey[K]>;
};

type ExportFormattingOptions = {
  reportSheetName?: string;
  metadataSheetName?: string;
  includeMetadataSheet?: boolean;
};

type ExportReportInput<K extends ReportKey = ReportKey> = {
  workspaceId: string;
  key: K;
  filters?: Partial<ReportFiltersByKey[K]>;
  formatting?: ExportFormattingOptions;
};

type GetReportRunInput = {
  workspaceId: string;
  key: string;
  runId: string;
};

type ExportedReport = {
  file: Buffer;
  filename: string;
  runId: string;
  isEmpty: boolean;
  message: string;
};

type ReportOutput = {
  rows: number;
  summary: string;
  caveat?: string;
  warnings?: string[];
  chartRows?: Array<Record<string, string | number | null>>;
  supportStatus: 'supported' | 'partial' | 'unsupported';
  supportReason?: string;
};

export type ReportComputationOutput = Omit<ReportOutput, 'supportStatus' | 'supportReason'>;


const reportExportHeadersByKey: Record<ReportKey, string[]> = {
  'sales-summary': [],
  'inventory-aging': [],
  'order-fulfillment-health': [],
  'orders-reversals-by-product': [
    'productId',
    'sku',
    'productName',
    'orderedQuantity',
    'reversedQuantity',
    'reversedQuantityRate',
    'returnRate',
  ],
  'orders-over-time': [
    'periodStart',
    'periodLabel',
    'ordersCount',
    'averageUnitsPerOrder',
    'averageOrderValue',
    'returnedUnits',
    'returnedAmount',
  ],
  'shipping-delivery-performance': ['metric', 'medianHours', 'sampleSize'],
  'orders-fulfilled-over-time': [
    'periodStart',
    'periodLabel',
    'fulfilledOrders',
    'medianOrderToFulfilledHours',
  ],
  'shipping-labels-over-time': ['periodStart', 'periodLabel', 'labelsPurchased', 'medianOrderToLabelHours'],
  'shipping-labels-by-order': [
    'orderId',
    'orderNumber',
    'labelsPurchased',
    'carrier',
    'service',
    'location',
    'firstLabelPurchasedAt',
  ],
  'items-bought-together': ['combination', 'ordersContaining', 'percentageOverQualifyingOrders'],
};

@Injectable()
export class OrdersReportsService {
  private readonly reports: ReportDefinition[] = [
    {
      key: 'sales-summary',
      label: 'Sales Summary',
      supportStatus: 'unsupported',
      supportReason:
        'Execution is not implemented yet; this key currently returns a placeholder summary with no computed rows.',
      requiredFeatures: ['sales-summary-report-runner'],
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
      supportStatus: 'unsupported',
      supportReason:
        'Execution is not implemented yet; this key currently returns a placeholder summary with no computed rows.',
      requiredFeatures: ['inventory-aging-report-runner'],
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
      supportStatus: 'unsupported',
      supportReason:
        'Execution is not implemented yet; this key currently returns a placeholder summary with no computed rows.',
      requiredFeatures: ['order-fulfillment-health-report-runner'],
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
    {
      key: 'orders-reversals-by-product',
      label: 'Orders Reversals by Product',
      supportStatus: 'supported',
      requiredFeatures: ['orders-reversals-by-product-report-runner'],
      defaultFilters: {
        platform: ['all'],
        dateRange: 'last_30_days',
        region: 'all',
        statuses: ['cancelled'],
      },
      filterDefinitions: reportFilterDefinitionsByKey['orders-reversals-by-product'],
      supportedPlatforms: ['all'],
      supportsExport: true,
    },
    {
      key: 'orders-over-time',
      label: 'Orders Over Time',
      supportStatus: 'supported',
      requiredFeatures: ['orders-over-time-report-runner'],
      defaultFilters: {
        platform: ['all'],
        dateRange: 'last_30_days',
        region: 'all',
        groupBy: 'day',
      },
      filterDefinitions: reportFilterDefinitionsByKey['orders-over-time'],
      supportedPlatforms: ['all'],
      supportsExport: true,
    },
    {
      key: 'shipping-delivery-performance',
      label: 'Shipping Delivery Performance',
      supportStatus: 'supported',
      requiredFeatures: ['shipping-delivery-performance-report-runner'],
      defaultFilters: {
        platform: ['all'],
        dateRange: 'last_14_days',
        region: 'all',
        carrierQuery: '',
        serviceQuery: '',
        locationQuery: '',
      },
      filterDefinitions: reportFilterDefinitionsByKey['shipping-delivery-performance'],
      supportedPlatforms: ['shopify', 'amazon', 'woocommerce'],
      supportsExport: true,
    },
    {
      key: 'orders-fulfilled-over-time',
      label: 'Orders Fulfilled Over Time',
      supportStatus: 'supported',
      requiredFeatures: ['orders-fulfilled-over-time-report-runner'],
      defaultFilters: {
        platform: ['all'],
        dateRange: 'last_30_days',
        region: 'all',
        statuses: ['fulfilled'],
        carrierQuery: '',
        serviceQuery: '',
        locationQuery: '',
      },
      filterDefinitions: reportFilterDefinitionsByKey['orders-fulfilled-over-time'],
      supportedPlatforms: ['all'],
      supportsExport: true,
    },
    {
      key: 'shipping-labels-over-time',
      label: 'Shipping Labels Over Time',
      supportStatus: 'supported',
      requiredFeatures: ['shipping-labels-over-time-report-runner'],
      defaultFilters: {
        platform: ['all'],
        dateRange: 'last_30_days',
        region: 'all',
        carrierQuery: '',
        serviceQuery: '',
        locationQuery: '',
      },
      filterDefinitions: reportFilterDefinitionsByKey['shipping-labels-over-time'],
      supportedPlatforms: ['shopify', 'amazon', 'woocommerce'],
      supportsExport: true,
    },
    {
      key: 'shipping-labels-by-order',
      label: 'Shipping Labels by Order',
      supportStatus: 'supported',
      requiredFeatures: ['shipping-labels-by-order-report-runner'],
      defaultFilters: {
        platform: ['all'],
        dateRange: 'last_30_days',
        region: 'all',
        carrierQuery: '',
        serviceQuery: '',
        locationQuery: '',
      },
      filterDefinitions: reportFilterDefinitionsByKey['shipping-labels-by-order'],
      supportedPlatforms: ['shopify', 'amazon', 'woocommerce'],
      supportsExport: true,
    },
    {
      key: 'items-bought-together',
      label: 'Items Bought Together',
      supportStatus: 'partial',
      supportReason:
        'Variant grouping mode is currently unavailable because order item variant identifiers are not available in the current schema.',
      requiredFeatures: ['items-bought-together-report-runner', 'order-item-variant-identifiers'],
      defaultFilters: {
        platform: ['all'],
        dateRange: 'last_90_days',
        region: 'all',
        combinationSize: '2',
        itemGroupingLevel: 'product',
        topN: 10,
      },
      filterDefinitions: reportFilterDefinitionsByKey['items-bought-together'],
      supportedPlatforms: ['all'],
      supportsExport: true,
    },
  ];

  private readonly runsByWorkspace = new Map<string, ReportRunRecord[]>();

  constructor(
    private readonly ordersTransactionalReportsService?: OrdersTransactionalReportsService,
    private readonly fulfillmentReportsService?: FulfillmentReportsService,
    private readonly inventoryReportsService?: InventoryReportsService,
    private readonly financeReportsService?: FinanceReportsService,
  ) {}

  listReports() {
    return this.reports;
  }

  hasReportKey(key: string): key is ReportKey {
    return this.reports.some((item) => item.key === key);
  }

  getFilterDefinitionMap<K extends ReportKey>(key: K) {
    return reportFilterDefinitionsByKey[key];
  }

  async runReport<K extends ReportKey>(input: RunReportInput<K>) {
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

    const reportOutput = await this.buildReportOutput(report.key, input.workspaceId, normalizedFilters);

    const run: ReportRunRecord = {
      id: `run_${Date.now().toString(36)}`,
      workspaceId: input.workspaceId,
      reportKey: report.key,
      filters: normalizedFilters,
      status: 'completed',
      output: {
        rows: reportOutput.rows,
        summary: reportOutput.summary,
        caveat: reportOutput.caveat,
        warnings: reportOutput.warnings,
        chartRows: reportOutput.chartRows,
        supportStatus: reportOutput.supportStatus,
        supportReason: reportOutput.supportReason,
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

  async exportReport<K extends ReportKey>(input: ExportReportInput<K>): Promise<ExportedReport> {
    const run = await this.runReport(input);
    const reportRows = this.generateRowsForExport(input.key, run.output.chartRows);
    const exportedAt = new Date();
    const metadataEntries = this.buildMetadataEntries({
      workspaceId: input.workspaceId,
      reportKey: input.key,
      runId: run.id,
      filters: run.filters,
      generatedAt: exportedAt,
      isEmpty: reportRows.length === 0,
      rowCount: reportRows.length,
    });

    const workbook = this.buildWorkbookXml({
      reportSheetName: input.formatting?.reportSheetName ?? 'Report Rows',
      metadataSheetName: input.formatting?.metadataSheetName ?? 'Metadata',
      includeMetadataSheet: input.formatting?.includeMetadataSheet ?? true,
      reportRows,
      metadataRows: metadataEntries,
    });

    const fileNameStamp = this.formatFileNameTimestamp(exportedAt);
    return {
      file: workbook,
      filename: `${input.key}_${fileNameStamp}.xlsx`,
      runId: run.id,
      isEmpty: reportRows.length === 0,
      message:
        reportRows.length === 0
          ? 'Export completed with metadata only because no rows matched the selected filters.'
          : 'Export completed successfully.',
    };
  }

  private async buildReportOutput(
    key: ReportKey,
    workspaceId: string,
    filters: ReportFiltersByKey[ReportKey],
  ): Promise<ReportOutput> {
    const report = this.reports.find((item) => item.key === key);
    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const withSupportMetadata = (output: ReportComputationOutput): ReportOutput => ({
      ...output,
      supportStatus: report.supportStatus,
      supportReason: report.supportReason,
    });

    switch (key) {
      case 'sales-summary':
        return withSupportMetadata(
          this.financeReportsService!.runSalesSummary(filters as ReportFiltersByKey['sales-summary']),
        );
      case 'inventory-aging':
        return withSupportMetadata(
          this.inventoryReportsService!.runInventoryAging(filters as ReportFiltersByKey['inventory-aging']),
        );
      case 'order-fulfillment-health':
        return withSupportMetadata(
          await this.fulfillmentReportsService!.runOrderFulfillmentHealth(
            filters as ReportFiltersByKey['order-fulfillment-health'],
          ),
        );
      case 'orders-reversals-by-product':
        return withSupportMetadata(
          await this.ordersTransactionalReportsService!.runOrdersReversalsByProduct(
            workspaceId,
            filters as ReportFiltersByKey['orders-reversals-by-product'],
          ),
        );
      case 'orders-over-time':
        return withSupportMetadata(
          await this.ordersTransactionalReportsService!.runOrdersOverTime(
            workspaceId,
            filters as ReportFiltersByKey['orders-over-time'],
          ),
        );
      case 'shipping-delivery-performance':
        return withSupportMetadata(
          await this.fulfillmentReportsService!.runShippingDeliveryPerformance(
            workspaceId,
            filters as ReportFiltersByKey['shipping-delivery-performance'],
          ),
        );
      case 'orders-fulfilled-over-time':
        return withSupportMetadata(
          await this.fulfillmentReportsService!.runOrdersFulfilledOverTime(
            workspaceId,
            filters as ReportFiltersByKey['orders-fulfilled-over-time'],
          ),
        );
      case 'shipping-labels-over-time':
        return withSupportMetadata(
          await this.fulfillmentReportsService!.runShippingLabelsOverTime(
            workspaceId,
            filters as ReportFiltersByKey['shipping-labels-over-time'],
          ),
        );
      case 'shipping-labels-by-order':
        return withSupportMetadata(
          await this.fulfillmentReportsService!.runShippingLabelsByOrder(
            workspaceId,
            filters as ReportFiltersByKey['shipping-labels-by-order'],
          ),
        );
      case 'items-bought-together':
        return withSupportMetadata(
          await this.ordersTransactionalReportsService!.runItemsBoughtTogether(
            workspaceId,
            filters as ReportFiltersByKey['items-bought-together'],
          ),
        );
    }
  }

  private generateRowsForExport(
    reportKey: ReportKey,
    chartRows?: Array<Record<string, string | number | null>>,
  ): Array<Record<string, string | number>> {
    if (!chartRows || chartRows.length === 0) {
      return [];
    }

    const expectedHeaders = reportExportHeadersByKey[reportKey];
    if (expectedHeaders.length === 0) {
      return chartRows.map((row) => {
        const normalizedRow: Record<string, string | number> = {};
        for (const [key, value] of Object.entries(row)) {
          normalizedRow[key] = typeof value === 'number' || typeof value === 'string' ? value : '';
        }
        return normalizedRow;
      });
    }

    return chartRows.map((row) => {
      const normalizedRow: Record<string, string | number> = {};
      for (const header of expectedHeaders) {
        const value = row[header];
        normalizedRow[header] = typeof value === 'number' || typeof value === 'string' ? value : '';
      }
      return normalizedRow;
    });
  }

  private buildMetadataEntries(input: {
    workspaceId: string;
    reportKey: ReportKey;
    runId: string;
    filters: ReportFiltersByKey[ReportKey];
    generatedAt: Date;
    isEmpty: boolean;
    rowCount: number;
  }): Array<[string, string]> {
    return buildReportMetadataEntries(input);
  }

  private formatFileNameTimestamp(value: Date): string {
    return formatReportFileNameTimestamp(value);
  }

  private buildWorkbookXml(input: {
    reportSheetName: string;
    metadataSheetName: string;
    includeMetadataSheet: boolean;
    reportRows: Array<Record<string, string | number>>;
    metadataRows: Array<[string, string]>;
  }): Buffer {
    return buildReportWorkbookXml(input);
  }

  private normalizePlatformFilter(key: ReportKey, rawValue: ReportPlatform[] | ReportPlatform): ReportPlatform[] {
    return normalizeReportPlatformFilter(key, rawValue, this.reports, reportPlatforms);
  }


}
