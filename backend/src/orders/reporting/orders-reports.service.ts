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
  };
  'orders-fulfilled-over-time': {
    platform: ReportPlatform[];
    dateRange: DateRangePreset;
    region: RegionOption;
    statuses: OrderStatusOption[];
  };
  'shipping-labels-over-time': {
    platform: ReportPlatform[];
    dateRange: DateRangePreset;
    region: RegionOption;
  };
  'shipping-labels-by-order': {
    platform: ReportPlatform[];
    dateRange: DateRangePreset;
    region: RegionOption;
  };
  'items-bought-together': {
    platform: ReportPlatform[];
    dateRange: Extract<DateRangePreset, 'last_30_days' | 'last_90_days'>;
    region: RegionOption;
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
    caveat?: string;
    chartRows?: Array<Record<string, string | number>>;
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
  chartRows?: Array<Record<string, string | number>>;
};

@Injectable()
export class OrdersReportsService {
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
    {
      key: 'orders-reversals-by-product',
      label: 'Orders Reversals by Product',
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
      defaultFilters: {
        platform: ['all'],
        dateRange: 'last_14_days',
        region: 'all',
      },
      filterDefinitions: reportFilterDefinitionsByKey['shipping-delivery-performance'],
      supportedPlatforms: ['shopify', 'amazon', 'woocommerce'],
      supportsExport: true,
    },
    {
      key: 'orders-fulfilled-over-time',
      label: 'Orders Fulfilled Over Time',
      defaultFilters: {
        platform: ['all'],
        dateRange: 'last_30_days',
        region: 'all',
        statuses: ['fulfilled'],
      },
      filterDefinitions: reportFilterDefinitionsByKey['orders-fulfilled-over-time'],
      supportedPlatforms: ['all'],
      supportsExport: true,
    },
    {
      key: 'shipping-labels-over-time',
      label: 'Shipping Labels Over Time',
      defaultFilters: {
        platform: ['all'],
        dateRange: 'last_30_days',
        region: 'all',
      },
      filterDefinitions: reportFilterDefinitionsByKey['shipping-labels-over-time'],
      supportedPlatforms: ['shopify', 'amazon', 'woocommerce'],
      supportsExport: true,
    },
    {
      key: 'shipping-labels-by-order',
      label: 'Shipping Labels by Order',
      defaultFilters: {
        platform: ['all'],
        dateRange: 'last_30_days',
        region: 'all',
      },
      filterDefinitions: reportFilterDefinitionsByKey['shipping-labels-by-order'],
      supportedPlatforms: ['shopify', 'amazon', 'woocommerce'],
      supportsExport: true,
    },
    {
      key: 'items-bought-together',
      label: 'Items Bought Together',
      defaultFilters: {
        platform: ['all'],
        dateRange: 'last_90_days',
        region: 'all',
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
        chartRows: reportOutput.chartRows,
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
    const reportRows = this.generateRowsForExport(input.key, run.output.rows, run.output.chartRows);
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
    switch (key) {
      case 'orders-reversals-by-product':
        return this.runOrdersReversalsByProduct(
          workspaceId,
          filters as ReportFiltersByKey['orders-reversals-by-product'],
        );
      case 'orders-over-time':
        return this.runOrdersOverTime(workspaceId, filters as ReportFiltersByKey['orders-over-time']);
      case 'items-bought-together':
        return this.runItemsBoughtTogether(
          workspaceId,
          filters as ReportFiltersByKey['items-bought-together'],
        );
      default: {
        return {
          rows: 0,
          summary: `${key} generated for ${(filters as ReportFiltersByKey['sales-summary']).dateRange}`,
        };
      }
    }
  }

  private async runOrdersReversalsByProduct(
    workspaceId: string,
    filters: ReportFiltersByKey['orders-reversals-by-product'],
  ): Promise<ReportOutput> {
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
  ): Promise<ReportOutput> {
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

  private async runItemsBoughtTogether(
    workspaceId: string,
    filters: ReportFiltersByKey['items-bought-together'],
  ): Promise<ReportOutput> {
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

    const pairCounts = new Map<string, number>();
    for (const order of orders) {
      const productIds = order.items.map((item) => item.productId).sort();
      for (let i = 0; i < productIds.length; i += 1) {
        for (let j = i + 1; j < productIds.length; j += 1) {
          const pairKey = `${productIds[i]}:${productIds[j]}`;
          pairCounts.set(pairKey, (pairCounts.get(pairKey) ?? 0) + 1);
        }
      }
    }

    return {
      rows: pairCounts.size,
      summary: `${pairCounts.size} product pairs found across ${orders.length} orders in ${filters.dateRange}.`,
    };
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
    rowCount: number,
    chartRows?: Array<Record<string, string | number>>,
  ): Array<Record<string, string | number>> {
    if (chartRows && chartRows.length > 0) {
      return chartRows;
    }

    if (rowCount <= 0) {
      return [];
    }

    return Array.from({ length: rowCount }, (_, index) => ({
      reportKey,
      rowNumber: index + 1,
      itemId: `${reportKey.replaceAll('-', '_')}_${(index + 1).toString().padStart(4, '0')}`,
      metric: (index + 1) * 10,
      status: index % 2 === 0 ? 'ok' : 'review',
    }));
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
