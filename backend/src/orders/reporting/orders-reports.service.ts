import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  buildMetadataEntries as buildReportMetadataEntries,
  buildWorkbookXml as buildReportWorkbookXml,
  formatFileNameTimestamp as formatReportFileNameTimestamp,
} from './report-export.builder';
import { normalizePlatformFilter as normalizeReportPlatformFilter } from './report-platform.utils';

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

type ReportComputationOutput = Omit<ReportOutput, 'supportStatus' | 'supportReason'>;

type ShippingOrderRecord = {
  id: string;
  orderNumber: string | null;
  orderedAt: Date | null;
  createdAt: Date;
  fulfillmentStatusEvents: Array<{ status: 'PLACED' | 'FULFILLED' | 'SHIPPED' | 'DELIVERED'; eventAt: Date }>;
  shippingLabelPurchases: Array<{ carrier: string; service: string; purchasedAt: Date }>;
  items: Array<{ location: { code: string } | null }>;
};

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

  constructor(private readonly prisma: PrismaService) {}

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
      case 'inventory-aging':
      case 'order-fulfillment-health':
        return withSupportMetadata({
          rows: 0,
          chartRows: [],
          summary: `${report.label} is not currently implemented for ${(
            filters as ReportFiltersByKey['sales-summary']
          ).dateRange}.`,
          caveat: report.supportReason,
        });
      case 'orders-reversals-by-product':
        return withSupportMetadata(
          await this.runOrdersReversalsByProduct(
            workspaceId,
            filters as ReportFiltersByKey['orders-reversals-by-product'],
          ),
        );
      case 'orders-over-time':
        return withSupportMetadata(
          await this.runOrdersOverTime(workspaceId, filters as ReportFiltersByKey['orders-over-time']),
        );
      case 'shipping-delivery-performance':
        return withSupportMetadata(
          await this.runShippingDeliveryPerformance(
            workspaceId,
            filters as ReportFiltersByKey['shipping-delivery-performance'],
          ),
        );
      case 'orders-fulfilled-over-time':
        return withSupportMetadata(
          await this.runOrdersFulfilledOverTime(
            workspaceId,
            filters as ReportFiltersByKey['orders-fulfilled-over-time'],
          ),
        );
      case 'shipping-labels-over-time':
        return withSupportMetadata(
          await this.runShippingLabelsOverTime(
            workspaceId,
            filters as ReportFiltersByKey['shipping-labels-over-time'],
          ),
        );
      case 'shipping-labels-by-order':
        return withSupportMetadata(
          await this.runShippingLabelsByOrder(
            workspaceId,
            filters as ReportFiltersByKey['shipping-labels-by-order'],
          ),
        );
      case 'items-bought-together':
        return withSupportMetadata(
          await this.runItemsBoughtTogether(
            workspaceId,
            filters as ReportFiltersByKey['items-bought-together'],
          ),
        );
    }
  }

  private async runOrdersReversalsByProduct(
    workspaceId: string,
    filters: ReportFiltersByKey['orders-reversals-by-product'],
  ): Promise<ReportComputationOutput> {
    const where = this.buildOrderWhereInput(workspaceId, filters);
    const orders = await this.prisma.order.findMany({
      where,
      select: {
        id: true,
        total: true,
        items: {
          select: {
            productId: true,
            quantity: true,
            product: {
              select: {
                sku: true,
                name: true,
              },
            },
          },
        },
        refunds: {
          select: {
            amount: true,
          },
        },
      },
    });

    if (orders.length === 0) {
      return { rows: 0, summary: 'No reversed products found for the selected filters.' };
    }

    type ProductAggregate = {
      productId: string;
      sku: string;
      name: string;
      orderedQuantity: number;
      reversedQuantity: number;
      orderCount: number;
      refundedOrderCount: number;
    };

    const aggregates = new Map<string, ProductAggregate>();
    let approximatedRefundAllocationUsed = false;

    for (const order of orders) {
      const orderRefundAmount = order.refunds.reduce((sum, refund) => sum + Number(refund.amount), 0);
      const hasRefund = orderRefundAmount > 0;

      const reversedByProduct = hasRefund
        ? this.allocateReversedQuantitiesByProduct({
            items: order.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
            refundAmount: orderRefundAmount,
            orderTotalAmount: Number(order.total),
          })
        : new Map<string, number>();

      if (hasRefund) {
        approximatedRefundAllocationUsed = true;
      }

      const orderProductIds = new Set<string>();
      const refundedOrderProductIds = new Set<string>();

      for (const item of order.items) {
        const existing =
          aggregates.get(item.productId) ??
          ({
            productId: item.productId,
            sku: item.product.sku,
            name: item.product.name,
            orderedQuantity: 0,
            reversedQuantity: 0,
            orderCount: 0,
            refundedOrderCount: 0,
          } satisfies ProductAggregate);

        existing.orderedQuantity += item.quantity;
        existing.reversedQuantity += reversedByProduct.get(item.productId) ?? 0;
        aggregates.set(item.productId, existing);

        orderProductIds.add(item.productId);
        if (hasRefund) {
          refundedOrderProductIds.add(item.productId);
        }
      }

      for (const productId of orderProductIds) {
        const aggregate = aggregates.get(productId);
        if (aggregate) {
          aggregate.orderCount += 1;
        }
      }
      for (const productId of refundedOrderProductIds) {
        const aggregate = aggregates.get(productId);
        if (aggregate) {
          aggregate.refundedOrderCount += 1;
        }
      }
    }

    const chartRows = Array.from(aggregates.values())
      .map((aggregate) => {
        const reversedQuantityRate =
          aggregate.orderedQuantity > 0
            ? Number(((aggregate.reversedQuantity / aggregate.orderedQuantity) * 100).toFixed(2))
            : 0;
        const returnRate =
          aggregate.orderCount > 0
            ? Number(((aggregate.refundedOrderCount / aggregate.orderCount) * 100).toFixed(2))
            : 0;

        return {
          productId: aggregate.productId,
          sku: aggregate.sku,
          productName: aggregate.name,
          orderedQuantity: aggregate.orderedQuantity,
          reversedQuantity: aggregate.reversedQuantity,
          reversedQuantityRate,
          returnRate,
        };
      })
      .filter((row) => row.reversedQuantity > 0 || row.orderedQuantity > 0)
      .sort((a, b) => b.reversedQuantity - a.reversedQuantity || a.sku.localeCompare(b.sku));

    const reversedUnits = chartRows.reduce((sum, row) => sum + row.reversedQuantity, 0);
    const orderedUnits = chartRows.reduce((sum, row) => sum + row.orderedQuantity, 0);
    const caveat = approximatedRefundAllocationUsed
      ? 'Partial mapping: refund records do not include line-level product references, so reversed quantity is deterministically allocated by each line item share of refunded order value.'
      : undefined;

    return {
      rows: chartRows.length,
      chartRows,
      caveat,
      summary: `${chartRows.length} products, ${orderedUnits} ordered units, and ${reversedUnits} reversed units in ${filters.dateRange}.${caveat ? ` Caveat: ${caveat}` : ''}`,
    };
  }

  private async runOrdersOverTime(
    workspaceId: string,
    filters: ReportFiltersByKey['orders-over-time'],
  ): Promise<ReportComputationOutput> {
    const where = this.buildOrderWhereInput(workspaceId, filters);
    const orders = await this.prisma.order.findMany({
      where,
      select: {
        orderedAt: true,
        createdAt: true,
        total: true,
        items: {
          select: {
            quantity: true,
          },
        },
        refunds: {
          select: {
            amount: true,
          },
        },
      },
    });

    if (orders.length === 0) {
      return {
        rows: 0,
        chartRows: [],
        summary: `No orders found in ${filters.dateRange} (${filters.groupBy} grouping).`,
      };
    }

    const buckets = new Map<
      string,
      {
        periodStart: Date;
        ordersCount: number;
        unitsTotal: number;
        grossOrderValueTotal: number;
        returnedUnits: number;
        returnedAmount: number;
      }
    >();

    for (const order of orders) {
      const sourceDate = order.orderedAt ?? order.createdAt;
      const periodStart = this.normalizeToPeriodStart(sourceDate, filters.groupBy);
      const key = periodStart.toISOString();
      const existing =
        buckets.get(key) ??
        ({
          periodStart,
          ordersCount: 0,
          unitsTotal: 0,
          grossOrderValueTotal: 0,
          returnedUnits: 0,
          returnedAmount: 0,
        } satisfies {
          periodStart: Date;
          ordersCount: number;
          unitsTotal: number;
          grossOrderValueTotal: number;
          returnedUnits: number;
          returnedAmount: number;
        });
      existing.ordersCount += 1;
      existing.unitsTotal += order.items.reduce((sum, item) => sum + item.quantity, 0);
      existing.grossOrderValueTotal += Number(order.total);
      const orderReturnedAmount = order.refunds.reduce((sum, refund) => sum + Number(refund.amount), 0);
      existing.returnedAmount += orderReturnedAmount;
      if (orderReturnedAmount > 0) {
        existing.returnedUnits += order.items.reduce((sum, item) => sum + item.quantity, 0);
      }
      buckets.set(key, existing);
    }

    const chartRows = Array.from(buckets.values())
      .sort((a, b) => a.periodStart.getTime() - b.periodStart.getTime())
      .map((bucket) => ({
        periodStart: bucket.periodStart.toISOString(),
        periodLabel: this.formatPeriodLabel(bucket.periodStart, filters.groupBy),
        ordersCount: bucket.ordersCount,
        averageUnitsPerOrder:
          bucket.ordersCount > 0 ? Number((bucket.unitsTotal / bucket.ordersCount).toFixed(2)) : 0,
        averageOrderValue:
          bucket.ordersCount > 0
            ? Number((bucket.grossOrderValueTotal / bucket.ordersCount).toFixed(2))
            : 0,
        returnedUnits: bucket.returnedUnits,
        returnedAmount: Number(bucket.returnedAmount.toFixed(2)),
      }));

    const refundedAmountTotal = chartRows.reduce(
      (sum, row) => sum + (typeof row.returnedAmount === 'number' ? row.returnedAmount : 0),
      0,
    );
    const returnedUnitsTotal = chartRows.reduce(
      (sum, row) => sum + (typeof row.returnedUnits === 'number' ? row.returnedUnits : 0),
      0,
    );

    return {
      rows: chartRows.length,
      chartRows,
      summary: `${orders.length} orders across ${chartRows.length} ${filters.groupBy} buckets in ${filters.dateRange}. Returned units: ${returnedUnitsTotal}. Refunded amount: ${refundedAmountTotal.toFixed(2)}.`,
    };
  }

  private async runShippingDeliveryPerformance(
    workspaceId: string,
    filters: ReportFiltersByKey['shipping-delivery-performance'],
  ): Promise<ReportComputationOutput> {
    const orders = await this.loadShippingOrders(workspaceId, filters);
    const warnings = this.buildShippingWarnings(orders);
    const scoped = this.applyShippingDimensionFilters(orders, filters);
    const durations = scoped
      .map((order) => this.buildTimelineDurations(order))
      .filter((row) => row.fulfilledToDeliveredHours !== null || row.shippedToDeliveredHours !== null);

    const chartRows = [
      {
        metric: 'fulfilled_to_delivered_hours',
        medianHours: this.median(durations.map((row) => row.fulfilledToDeliveredHours)),
        sampleSize: durations.filter((row) => row.fulfilledToDeliveredHours !== null).length,
      },
      {
        metric: 'shipped_to_delivered_hours',
        medianHours: this.median(durations.map((row) => row.shippedToDeliveredHours)),
        sampleSize: durations.filter((row) => row.shippedToDeliveredHours !== null).length,
      },
      {
        metric: 'ordered_to_delivered_hours',
        medianHours: this.median(durations.map((row) => row.orderedToDeliveredHours)),
        sampleSize: durations.filter((row) => row.orderedToDeliveredHours !== null).length,
      },
    ];

    return {
      rows: chartRows.length,
      chartRows,
      warnings,
      summary: `${scoped.length} shipping orders analyzed with median delivery timeline deltas in ${filters.dateRange}.`,
      caveat: warnings.length > 0 ? warnings.join(' ') : undefined,
    };
  }

  private async runOrdersFulfilledOverTime(
    workspaceId: string,
    filters: ReportFiltersByKey['orders-fulfilled-over-time'],
  ): Promise<ReportComputationOutput> {
    const orders = await this.loadShippingOrders(workspaceId, filters);

    const warnings = this.buildShippingWarnings(orders);
    const scoped = this.applyShippingDimensionFilters(orders, filters);
    const fulfilledOrders = scoped
      .map((order) => ({
        ...order,
        fulfillmentStatusEvents: order.fulfillmentStatusEvents.filter((event) => event.status === 'FULFILLED'),
      }))
      .filter((order) => order.fulfillmentStatusEvents.length > 0);
    const buckets = new Map<string, { periodStart: Date; fulfillmentDurations: number[]; fulfilledCount: number }>();
    for (const order of fulfilledOrders) {
      const fulfilledAt = order.fulfillmentStatusEvents[0]?.eventAt ?? null;
      if (!fulfilledAt) {
        continue;
      }
      const periodStart = this.normalizeToPeriodStart(fulfilledAt, 'day');
      const key = periodStart.toISOString();
      const bucket =
        buckets.get(key) ?? { periodStart, fulfillmentDurations: [], fulfilledCount: 0 };
      bucket.fulfilledCount += 1;
      const baseline = order.orderedAt ?? order.createdAt ?? null;
      const duration = this.diffHoursNullable(baseline, fulfilledAt);
      if (duration !== null) {
        bucket.fulfillmentDurations.push(duration);
      }
      buckets.set(key, bucket);
    }

    const chartRows = Array.from(buckets.values())
      .sort((a, b) => a.periodStart.getTime() - b.periodStart.getTime())
      .map((bucket) => ({
        periodStart: bucket.periodStart.toISOString(),
        periodLabel: this.formatPeriodLabel(bucket.periodStart, 'day'),
        fulfilledOrders: bucket.fulfilledCount,
        medianOrderToFulfilledHours: this.median(bucket.fulfillmentDurations),
      }));

    return {
      rows: chartRows.length,
      chartRows,
      warnings,
      summary: `${fulfilledOrders.length} fulfilled orders grouped into ${chartRows.length} daily buckets in ${filters.dateRange}.`,
      caveat: warnings.length > 0 ? warnings.join(' ') : undefined,
    };
  }

  private async runShippingLabelsOverTime(
    workspaceId: string,
    filters: ReportFiltersByKey['shipping-labels-over-time'],
  ): Promise<ReportComputationOutput> {
    const orders = await this.loadShippingOrders(workspaceId, filters);
    const warnings = this.buildShippingWarnings(orders);
    const scoped = this.applyShippingDimensionFilters(orders, filters);
    const buckets = new Map<string, { periodStart: Date; labels: number; leadTimes: number[] }>();

    for (const order of scoped) {
      const baseline = order.orderedAt ?? order.createdAt ?? null;
      for (const label of order.shippingLabelPurchases) {
        const periodStart = this.normalizeToPeriodStart(label.purchasedAt, 'day');
        const key = periodStart.toISOString();
        const bucket = buckets.get(key) ?? { periodStart, labels: 0, leadTimes: [] };
        bucket.labels += 1;
        const leadHours = this.diffHoursNullable(baseline, label.purchasedAt);
        if (leadHours !== null) {
          bucket.leadTimes.push(leadHours);
        }
        buckets.set(key, bucket);
      }
    }

    const chartRows = Array.from(buckets.values())
      .sort((a, b) => a.periodStart.getTime() - b.periodStart.getTime())
      .map((bucket) => ({
        periodStart: bucket.periodStart.toISOString(),
        periodLabel: this.formatPeriodLabel(bucket.periodStart, 'day'),
        labelsPurchased: bucket.labels,
        medianOrderToLabelHours: this.median(bucket.leadTimes),
      }));

    return {
      rows: chartRows.length,
      chartRows,
      warnings,
      summary: `${chartRows.reduce((sum, row) => sum + (typeof row.labelsPurchased === 'number' ? row.labelsPurchased : 0), 0)} labels across ${chartRows.length} daily buckets in ${filters.dateRange}.`,
      caveat: warnings.length > 0 ? warnings.join(' ') : undefined,
    };
  }

  private async runShippingLabelsByOrder(
    workspaceId: string,
    filters: ReportFiltersByKey['shipping-labels-by-order'],
  ): Promise<ReportComputationOutput> {
    const orders = await this.loadShippingOrders(workspaceId, filters);
    const warnings = this.buildShippingWarnings(orders);
    const scoped = this.applyShippingDimensionFilters(orders, filters);

    const chartRows = scoped
      .filter((order) => order.shippingLabelPurchases.length > 0)
      .map((order) => {
        const carriers = this.uniqueNonEmpty(order.shippingLabelPurchases.map((label) => label.carrier));
        const services = this.uniqueNonEmpty(order.shippingLabelPurchases.map((label) => label.service));
        const locations = this.uniqueNonEmpty(order.items.map((item) => item.location?.code ?? null));
        return {
          orderId: order.id,
          orderNumber: order.orderNumber ?? null,
          labelsPurchased: order.shippingLabelPurchases.length,
          carrier: carriers.length === 0 ? null : carriers.join(','),
          service: services.length === 0 ? null : services.join(','),
          location: locations.length === 0 ? null : locations.join(','),
          firstLabelPurchasedAt: order.shippingLabelPurchases
            .map((label) => label.purchasedAt)
            .sort((a, b) => a.getTime() - b.getTime())[0]
            ?.toISOString() ?? null,
        };
      });

    return {
      rows: chartRows.length,
      chartRows,
      warnings,
      summary: `${chartRows.length} orders with shipping label purchases in ${filters.dateRange}.`,
      caveat: warnings.length > 0 ? warnings.join(' ') : undefined,
    };
  }

  private async loadShippingOrders(
    workspaceId: string,
    filters: {
      platform: ReportPlatform[];
      dateRange: DateRangePreset;
      region: RegionOption;
      statuses?: OrderStatusOption[];
    },
  ): Promise<ShippingOrderRecord[]> {
    const where = this.buildOrderWhereInput(workspaceId, filters);
    const orders = await this.prisma.order.findMany({
      where,
      select: {
        id: true,
        orderNumber: true,
        orderedAt: true,
        createdAt: true,
      },
    });

    if (orders.length === 0) {
      return [];
    }

    const orderIds = new Set(orders.map((order) => order.id));
    const [events, labels, orderItems] = await Promise.all([
      this.prisma.$queryRaw<Array<{ orderId: string; status: string; eventAt: Date }>>`
        SELECT "orderId", "status", "eventAt"
        FROM "OrderFulfillmentStatusEvent"
        WHERE "workspaceId" = ${workspaceId}
      `,
      this.prisma.$queryRaw<Array<{ orderId: string; carrier: string; service: string; purchasedAt: Date }>>`
        SELECT "orderId", "carrier", "service", "purchasedAt"
        FROM "OrderShippingLabelPurchase"
        WHERE "workspaceId" = ${workspaceId}
      `,
      this.prisma.orderItem.findMany({
        where: { orderId: { in: Array.from(orderIds) } },
        select: {
          orderId: true,
          location: { select: { code: true } },
        },
      }),
    ]);

    const eventsByOrder = new Map<string, ShippingOrderRecord['fulfillmentStatusEvents']>();
    for (const event of events) {
      if (!orderIds.has(event.orderId)) {
        continue;
      }
      const existing = eventsByOrder.get(event.orderId) ?? [];
      if (
        event.status === 'PLACED' ||
        event.status === 'FULFILLED' ||
        event.status === 'SHIPPED' ||
        event.status === 'DELIVERED'
      ) {
        existing.push({ status: event.status, eventAt: event.eventAt });
      }
      eventsByOrder.set(event.orderId, existing.sort((a, b) => a.eventAt.getTime() - b.eventAt.getTime()));
    }

    const labelsByOrder = new Map<string, ShippingOrderRecord['shippingLabelPurchases']>();
    for (const label of labels) {
      if (!orderIds.has(label.orderId)) {
        continue;
      }
      const existing = labelsByOrder.get(label.orderId) ?? [];
      existing.push(label);
      labelsByOrder.set(
        label.orderId,
        existing.sort((a, b) => a.purchasedAt.getTime() - b.purchasedAt.getTime()),
      );
    }

    const locationsByOrder = new Map<string, ShippingOrderRecord['items']>();
    for (const item of orderItems) {
      const existing = locationsByOrder.get(item.orderId) ?? [];
      existing.push({ location: item.location?.code ? { code: item.location.code } : null });
      locationsByOrder.set(item.orderId, existing);
    }

    return orders.map((order) => ({
      ...order,
      fulfillmentStatusEvents: eventsByOrder.get(order.id) ?? [],
      shippingLabelPurchases: labelsByOrder.get(order.id) ?? [],
      items: locationsByOrder.get(order.id) ?? [],
    }));
  }

  private applyShippingDimensionFilters<T extends {
    shippingLabelPurchases: Array<{ carrier: string; service: string; purchasedAt: Date }>;
    items: Array<{ location: { code: string } | null }>;
  }>(
    orders: T[],
    filters: { carrierQuery: string; serviceQuery: string; locationQuery: string },
  ): T[] {
    const carrierQuery = filters.carrierQuery.trim().toLowerCase();
    const serviceQuery = filters.serviceQuery.trim().toLowerCase();
    const locationQuery = filters.locationQuery.trim().toLowerCase();
    return orders.filter((order) => {
      const carrierMatch =
        carrierQuery.length === 0 ||
        order.shippingLabelPurchases.some((label) => label.carrier.toLowerCase().includes(carrierQuery));
      const serviceMatch =
        serviceQuery.length === 0 ||
        order.shippingLabelPurchases.some((label) => label.service.toLowerCase().includes(serviceQuery));
      const locationMatch =
        locationQuery.length === 0 ||
        order.items.some((item) => (item.location?.code ?? '').toLowerCase().includes(locationQuery));
      return carrierMatch && serviceMatch && locationMatch;
    });
  }

  private buildShippingWarnings(
    orders: Array<{
      fulfillmentStatusEvents?: Array<{ eventAt: Date }>;
      shippingLabelPurchases: Array<{ purchasedAt: Date }>;
      items: Array<{ location: { code: string } | null }>;
    }>,
  ): string[] {
    const warnings: string[] = [];
    if (orders.length === 0) {
      warnings.push('Warning: No orders were found for the selected workspace and date range.');
      return warnings;
    }
    const totalEvents = orders.reduce((sum, order) => sum + (order.fulfillmentStatusEvents?.length ?? 0), 0);
    const totalLabels = orders.reduce((sum, order) => sum + order.shippingLabelPurchases.length, 0);
    const ordersWithLocation = orders.filter((order) => order.items.some((item) => item.location?.code)).length;

    if (totalEvents === 0) {
      warnings.push('Warning: Workspace has no fulfillment status events required for shipping timeline metrics.');
    }
    if (totalLabels === 0) {
      warnings.push('Warning: Workspace has no shipping label purchases required for shipping reports.');
    }
    if (ordersWithLocation === 0) {
      warnings.push('Warning: Workspace has no order-item locations; location filters will return no matches.');
    }

    return warnings;
  }

  private buildTimelineDurations(order: {
    orderedAt: Date | null;
    createdAt: Date;
    fulfillmentStatusEvents: Array<{ status: 'PLACED' | 'FULFILLED' | 'SHIPPED' | 'DELIVERED'; eventAt: Date }>;
  }) {
    const firstFulfilled = order.fulfillmentStatusEvents.find((event) => event.status === 'FULFILLED')?.eventAt ?? null;
    const firstShipped = order.fulfillmentStatusEvents.find((event) => event.status === 'SHIPPED')?.eventAt ?? null;
    const firstDelivered = order.fulfillmentStatusEvents.find((event) => event.status === 'DELIVERED')?.eventAt ?? null;
    const baseline = order.orderedAt ?? order.createdAt ?? null;

    return {
      fulfilledToDeliveredHours: this.diffHoursNullable(firstFulfilled, firstDelivered),
      shippedToDeliveredHours: this.diffHoursNullable(firstShipped, firstDelivered),
      orderedToDeliveredHours: this.diffHoursNullable(baseline, firstDelivered),
    };
  }

  private diffHoursNullable(start: Date | null, end: Date | null): number | null {
    if (!start || !end) {
      return null;
    }
    const millis = end.getTime() - start.getTime();
    if (!Number.isFinite(millis) || millis < 0) {
      return null;
    }
    return Number((millis / (1000 * 60 * 60)).toFixed(2));
  }

  private median(values: Array<number | null>): number | null {
    const sorted = values
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
      .sort((a, b) => a - b);
    if (sorted.length === 0) {
      return null;
    }
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 1) {
      return Number(sorted[mid].toFixed(2));
    }
    return Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2));
  }

  private uniqueNonEmpty(values: Array<string | null | undefined>): string[] {
    return Array.from(
      new Set(
        values
          .map((value) => value?.trim())
          .filter((value): value is string => typeof value === 'string' && value.length > 0),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }

  private async runItemsBoughtTogether(
    workspaceId: string,
    filters: ReportFiltersByKey['items-bought-together'],
  ): Promise<ReportComputationOutput> {
    if (filters.itemGroupingLevel === 'variant') {
      return {
        rows: 0,
        summary:
          'Variant mode is currently unsupported/disabled because OrderItem variant identifiers are unavailable in the current schema.',
        caveat:
          'Using product-level identifiers only. Variant-level combinations cannot be calculated with the current OrderItem fields.',
        chartRows: [],
      };
    }

    const where = this.buildOrderWhereInput(workspaceId, filters);
    const orders = await this.prisma.order.findMany({
      where,
      select: {
        items: {
          select: { productId: true },
          distinct: ['productId'],
        },
      },
    });

    const combinationSize = Number(filters.combinationSize);
    const topN = Math.max(1, Math.min(100, Math.floor(filters.topN)));
    const combinationCounts = new Map<string, number>();
    let qualifyingOrders = 0;

    for (const order of orders) {
      const productIds = order.items.map((item) => item.productId).sort();
      if (productIds.length < combinationSize) {
        continue;
      }

      qualifyingOrders += 1;
      for (const combination of this.buildCombinations(productIds, combinationSize)) {
        const combinationKey = combination.join(':');
        combinationCounts.set(combinationKey, (combinationCounts.get(combinationKey) ?? 0) + 1);
      }
    }

    const sortedRows = Array.from(combinationCounts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, topN)
      .map(([combination, ordersContaining]) => {
        const percentageOverQualifyingOrders =
          qualifyingOrders > 0 ? Number(((ordersContaining / qualifyingOrders) * 100).toFixed(2)) : 0;
        return {
          combination,
          ordersContaining,
          percentageOverQualifyingOrders,
        };
      });

    return {
      rows: sortedRows.length,
      chartRows: sortedRows,
      summary: `${sortedRows.length} top product ${combinationSize === 2 ? 'pairs' : 'triples'} returned from ${combinationCounts.size} combinations across ${qualifyingOrders} qualifying orders in ${filters.dateRange}.`,
    };
  }

  private buildCombinations(items: string[], combinationSize: number): string[][] {
    const combinations: string[][] = [];
    const current: string[] = [];

    const visit = (startIndex: number) => {
      if (current.length === combinationSize) {
        combinations.push([...current]);
        return;
      }

      for (let index = startIndex; index < items.length; index += 1) {
        current.push(items[index]);
        visit(index + 1);
        current.pop();
      }
    };

    visit(0);
    return combinations;
  }

  private buildOrderWhereInput(
    workspaceId: string,
    filters: {
      platform: ReportPlatform[];
      dateRange: DateRangePreset;
      region: RegionOption;
      statuses?: OrderStatusOption[];
    },
  ) {
    const dateRange = this.getDateRangeStart(filters.dateRange);
    const where: {
      workspaceId: string;
      OR: Array<{ orderedAt: { gte: Date } } | { orderedAt: null; createdAt: { gte: Date } }>;
      channel?: { in: string[] };
      shipCountryCode?: { in: string[] };
      status?: { in: string[] };
    } = {
      workspaceId,
      OR: [{ orderedAt: { gte: dateRange } }, { orderedAt: null, createdAt: { gte: dateRange } }],
    };

    const normalizedPlatforms = filters.platform.filter((platform) => platform !== 'all');
    if (normalizedPlatforms.length > 0) {
      where.channel = { in: normalizedPlatforms };
    }

    const regionCountryCodes: Record<Exclude<RegionOption, 'all'>, string[]> = {
      na: ['US', 'CA', 'MX'],
      eu: ['GB', 'DE', 'FR', 'ES', 'IT', 'NL'],
      apac: ['AU', 'NZ', 'JP', 'SG'],
    };
    if (filters.region !== 'all') {
      where.shipCountryCode = { in: regionCountryCodes[filters.region] };
    }

    if (filters.statuses && !filters.statuses.includes('all')) {
      where.status = { in: filters.statuses };
    }

    return where;
  }

  private allocateReversedQuantitiesByProduct(input: {
    items: Array<{ productId: string; quantity: number }>;
    refundAmount: number;
    orderTotalAmount: number;
  }): Map<string, number> {
    const quantitiesByProduct = new Map<string, number>();
    for (const item of input.items) {
      quantitiesByProduct.set(item.productId, (quantitiesByProduct.get(item.productId) ?? 0) + item.quantity);
    }

    const orderUnits = Array.from(quantitiesByProduct.values()).reduce((sum, quantity) => sum + quantity, 0);
    if (orderUnits <= 0 || input.refundAmount <= 0) {
      return new Map<string, number>();
    }

    const cappedRatio =
      input.orderTotalAmount > 0
        ? Math.max(0, Math.min(1, input.refundAmount / input.orderTotalAmount))
        : 1;
    const targetReversedUnits = Math.min(orderUnits, orderUnits * cappedRatio);

    const allocations = Array.from(quantitiesByProduct.entries()).map(([productId, quantity]) => {
      const exact = quantity * cappedRatio;
      const floor = Math.floor(exact);
      return { productId, quantity, floor, remainder: exact - floor };
    });

    let allocated = allocations.reduce((sum, item) => sum + item.floor, 0);
    const targetRounded = Math.round(targetReversedUnits);
    const remainingUnits = Math.max(0, targetRounded - allocated);

    const sortedByRemainder = [...allocations].sort(
      (a, b) => b.remainder - a.remainder || a.productId.localeCompare(b.productId),
    );
    for (let i = 0; i < remainingUnits; i += 1) {
      const allocation = sortedByRemainder[i % sortedByRemainder.length];
      if (allocation.floor < allocation.quantity) {
        allocation.floor += 1;
        allocated += 1;
      }
      if (allocated >= targetRounded) {
        break;
      }
    }

    return new Map(allocations.map((item) => [item.productId, Math.min(item.floor, item.quantity)]));
  }

  private getDateRangeStart(dateRange: DateRangePreset): Date {
    const now = new Date();
    const daysBackByRange: Record<DateRangePreset, number> = {
      last_7_days: 7,
      last_14_days: 14,
      last_30_days: 30,
      last_90_days: 90,
    };
    const daysBack = daysBackByRange[dateRange];

    return new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
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

  private normalizeToPeriodStart(value: Date, groupBy: TimeGroupingOption): Date {
    const year = value.getUTCFullYear();
    const month = value.getUTCMonth();
    const day = value.getUTCDate();
    const hour = value.getUTCHours();

    if (groupBy === 'hour') {
      return new Date(Date.UTC(year, month, day, hour));
    }
    if (groupBy === 'day') {
      return new Date(Date.UTC(year, month, day));
    }
    if (groupBy === 'month') {
      return new Date(Date.UTC(year, month, 1));
    }

    const dayOfWeek = value.getUTCDay();
    const daysFromMonday = (dayOfWeek + 6) % 7;
    return new Date(Date.UTC(year, month, day - daysFromMonday));
  }

  private formatPeriodLabel(value: Date, groupBy: TimeGroupingOption): string {
    const iso = value.toISOString();
    if (groupBy === 'hour') {
      return iso.slice(0, 13) + ':00';
    }
    if (groupBy === 'day') {
      return iso.slice(0, 10);
    }
    if (groupBy === 'month') {
      return iso.slice(0, 7);
    }
    return `week_of_${iso.slice(0, 10)}`;
  }

}
