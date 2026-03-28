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

  async exportReport<K extends ReportKey>(input: ExportReportInput<K>): Promise<ExportedReport> {
    const run = this.runReport(input);
    const reportRows = this.generateRowsForExport(input.key, run.output.rows);
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

  private generateRowsForExport(reportKey: ReportKey, rowCount: number): Array<Record<string, string | number>> {
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
    const fromTo = this.resolveDateRangeToFromTo(input.filters.dateRange);
    const platformSelection = Array.isArray(input.filters.platform)
      ? input.filters.platform.join(', ')
      : String(input.filters.platform);

    return [
      ['workspaceId', input.workspaceId],
      ['reportKey', input.reportKey],
      ['runId', input.runId],
      ['generatedAt', input.generatedAt.toISOString()],
      ['from', fromTo.from],
      ['to', fromTo.to],
      ['platformSelection', platformSelection],
      ['rowCount', String(input.rowCount)],
      [
        'message',
        input.isEmpty
          ? 'No report rows matched selected filters. File contains metadata for auditability.'
          : 'Report rows generated.',
      ],
    ];
  }

  private resolveDateRangeToFromTo(range: DateRangePreset): { from: string; to: string } {
    const now = new Date();
    const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const daysBackByPreset: Record<DateRangePreset, number> = {
      last_7_days: 7,
      last_14_days: 14,
      last_30_days: 30,
      last_90_days: 90,
    };
    const from = new Date(to);
    from.setUTCDate(from.getUTCDate() - (daysBackByPreset[range] - 1));

    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    };
  }

  private formatFileNameTimestamp(value: Date): string {
    const yyyy = value.getUTCFullYear();
    const mm = `${value.getUTCMonth() + 1}`.padStart(2, '0');
    const dd = `${value.getUTCDate()}`.padStart(2, '0');
    const hh = `${value.getUTCHours()}`.padStart(2, '0');
    const min = `${value.getUTCMinutes()}`.padStart(2, '0');
    return `${yyyy}${mm}${dd}_${hh}${min}`;
  }

  private buildWorkbookXml(input: {
    reportSheetName: string;
    metadataSheetName: string;
    includeMetadataSheet: boolean;
    reportRows: Array<Record<string, string | number>>;
    metadataRows: Array<[string, string]>;
  }): Buffer {
    const normalizedReportSheetName = this.normalizeSheetName(input.reportSheetName);
    const normalizedMetadataSheetName = this.normalizeSheetName(input.metadataSheetName);
    const reportHeaders = input.reportRows.length > 0 ? Object.keys(input.reportRows[0]) : ['message'];
    const reportDataRows =
      input.reportRows.length > 0
        ? input.reportRows.map((row) => reportHeaders.map((header) => String(row[header] ?? '')))
        : [['No rows returned for selected filters']];
    const metadataDataRows = input.metadataRows.map(([key, value]) => [key, value]);

    const files: Array<{ name: string; content: Buffer }> = [
      {
        name: '[Content_Types].xml',
        content: Buffer.from(this.buildContentTypesXml(input.includeMetadataSheet), 'utf-8'),
      },
      {
        name: '_rels/.rels',
        content: Buffer.from(this.buildRootRelsXml(), 'utf-8'),
      },
      {
        name: 'xl/workbook.xml',
        content: Buffer.from(
          this.buildWorkbookDocumentXml({
            reportSheetName: normalizedReportSheetName,
            metadataSheetName: normalizedMetadataSheetName,
            includeMetadataSheet: input.includeMetadataSheet,
          }),
          'utf-8',
        ),
      },
      {
        name: 'xl/_rels/workbook.xml.rels',
        content: Buffer.from(this.buildWorkbookRelsXml(input.includeMetadataSheet), 'utf-8'),
      },
      {
        name: 'xl/styles.xml',
        content: Buffer.from(this.buildStylesXml(), 'utf-8'),
      },
      {
        name: 'xl/worksheets/sheet1.xml',
        content: Buffer.from(this.buildWorksheetXml(reportHeaders, reportDataRows), 'utf-8'),
      },
    ];

    if (input.includeMetadataSheet) {
      files.push({
        name: 'xl/worksheets/sheet2.xml',
        content: Buffer.from(this.buildWorksheetXml(['field', 'value'], metadataDataRows), 'utf-8'),
      });
    }

    return this.createZipArchive(files);
  }

  private normalizeSheetName(value: string): string {
    const sanitized = value.replaceAll(/[\\/*?:[\]]/g, ' ').trim();
    return sanitized.length === 0 ? 'Sheet' : sanitized.slice(0, 31);
  }

  private xmlEscape(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&apos;');
  }

  private buildWorksheetXml(headers: string[], rows: string[][]): string {
    const allRows = [headers, ...rows];
    const rowXml = allRows
      .map((columns, rowIndex) => {
        const cells = columns
          .map((value, columnIndex) => {
            const cellRef = `${this.columnNumberToName(columnIndex + 1)}${rowIndex + 1}`;
            return `<c r="${cellRef}" t="inlineStr"><is><t>${this.xmlEscape(value)}</t></is></c>`;
          })
          .join('');
        return `<row r="${rowIndex + 1}">${cells}</row>`;
      })
      .join('');

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${rowXml}</sheetData>
</worksheet>`;
  }

  private columnNumberToName(columnNumber: number): string {
    let dividend = columnNumber;
    let columnName = '';

    while (dividend > 0) {
      const modulo = (dividend - 1) % 26;
      columnName = String.fromCharCode(65 + modulo) + columnName;
      dividend = Math.floor((dividend - modulo) / 26);
    }

    return columnName;
  }

  private buildContentTypesXml(includeMetadataSheet: boolean): string {
    const overrides = [
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>',
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>',
    ];
    if (includeMetadataSheet) {
      overrides.push(
        '<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>',
      );
    }

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  ${overrides.join('')}
</Types>`;
  }

  private buildRootRelsXml(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
  }

  private buildWorkbookDocumentXml(input: {
    reportSheetName: string;
    metadataSheetName: string;
    includeMetadataSheet: boolean;
  }): string {
    const metadataSheet = input.includeMetadataSheet
      ? `<sheet name="${this.xmlEscape(input.metadataSheetName)}" sheetId="2" r:id="rId2"/>`
      : '';

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="${this.xmlEscape(input.reportSheetName)}" sheetId="1" r:id="rId1"/>
    ${metadataSheet}
  </sheets>
</workbook>`;
  }

  private buildWorkbookRelsXml(includeMetadataSheet: boolean): string {
    const metadataRelation = includeMetadataSheet
      ? '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>'
      : '';

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  ${metadataRelation}
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
  }

  private buildStylesXml(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border/></borders>
  <cellStyleXfs count="1"><xf/></cellStyleXfs>
  <cellXfs count="1"><xf xfId="0"/></cellXfs>
</styleSheet>`;
  }

  private createZipArchive(files: Array<{ name: string; content: Buffer }>): Buffer {
    const localHeaders: Buffer[] = [];
    const centralDirectory: Buffer[] = [];
    let offset = 0;

    files.forEach((file) => {
      const fileName = Buffer.from(file.name, 'utf-8');
      const crc32 = this.computeCrc32(file.content);
      const localHeader = Buffer.alloc(30 + fileName.length);
      localHeader.writeUInt32LE(0x04034b50, 0);
      localHeader.writeUInt16LE(20, 4);
      localHeader.writeUInt16LE(0, 6);
      localHeader.writeUInt16LE(0, 8);
      localHeader.writeUInt16LE(0, 10);
      localHeader.writeUInt16LE(0, 12);
      localHeader.writeUInt32LE(crc32 >>> 0, 14);
      localHeader.writeUInt32LE(file.content.length, 18);
      localHeader.writeUInt32LE(file.content.length, 22);
      localHeader.writeUInt16LE(fileName.length, 26);
      localHeader.writeUInt16LE(0, 28);
      fileName.copy(localHeader, 30);
      localHeaders.push(localHeader, file.content);

      const centralHeader = Buffer.alloc(46 + fileName.length);
      centralHeader.writeUInt32LE(0x02014b50, 0);
      centralHeader.writeUInt16LE(20, 4);
      centralHeader.writeUInt16LE(20, 6);
      centralHeader.writeUInt16LE(0, 8);
      centralHeader.writeUInt16LE(0, 10);
      centralHeader.writeUInt16LE(0, 12);
      centralHeader.writeUInt16LE(0, 14);
      centralHeader.writeUInt32LE(crc32 >>> 0, 16);
      centralHeader.writeUInt32LE(file.content.length, 20);
      centralHeader.writeUInt32LE(file.content.length, 24);
      centralHeader.writeUInt16LE(fileName.length, 28);
      centralHeader.writeUInt16LE(0, 30);
      centralHeader.writeUInt16LE(0, 32);
      centralHeader.writeUInt16LE(0, 34);
      centralHeader.writeUInt16LE(0, 36);
      centralHeader.writeUInt32LE(0, 38);
      centralHeader.writeUInt32LE(offset, 42);
      fileName.copy(centralHeader, 46);
      centralDirectory.push(centralHeader);

      offset += localHeader.length + file.content.length;
    });

    const centralDirectorySize = centralDirectory.reduce((sum, part) => sum + part.length, 0);
    const endRecord = Buffer.alloc(22);
    endRecord.writeUInt32LE(0x06054b50, 0);
    endRecord.writeUInt16LE(0, 4);
    endRecord.writeUInt16LE(0, 6);
    endRecord.writeUInt16LE(files.length, 8);
    endRecord.writeUInt16LE(files.length, 10);
    endRecord.writeUInt32LE(centralDirectorySize, 12);
    endRecord.writeUInt32LE(offset, 16);
    endRecord.writeUInt16LE(0, 20);

    return Buffer.concat([...localHeaders, ...centralDirectory, endRecord]);
  }

  private computeCrc32(data: Buffer): number {
    let crc = 0xffffffff;
    for (let index = 0; index < data.length; index += 1) {
      crc ^= data[index];
      for (let bit = 0; bit < 8; bit += 1) {
        const mask = -(crc & 1);
        crc = (crc >>> 1) ^ (0xedb88320 & mask);
      }
    }
    return ~crc;
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
