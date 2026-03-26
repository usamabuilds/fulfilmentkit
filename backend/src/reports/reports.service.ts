import { Injectable, NotFoundException } from '@nestjs/common';

type ReportKey = 'sales-summary' | 'inventory-aging' | 'order-fulfillment-health';
type ReportPlatform = 'shopify' | 'amazon' | 'woocommerce' | 'all';

type ReportFilterSet = {
  dateRange: string;
  region: string;
  status: string;
};

type ReportDefinition = {
  key: ReportKey;
  label: string;
  defaultFilters: ReportFilterSet;
  supportedPlatforms: ReportPlatform[];
  supportsExport: boolean;
};

type ReportRunRecord = {
  id: string;
  workspaceId: string;
  reportKey: ReportKey;
  filters: ReportFilterSet;
  status: 'completed';
  output: {
    rows: number;
    summary: string;
    generatedAt: string;
  };
  createdAt: Date;
};

type RunReportInput = {
  workspaceId: string;
  key: string;
  filters?: Partial<ReportFilterSet>;
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
      defaultFilters: { dateRange: 'last_30_days', region: 'all', status: 'all' },
      supportedPlatforms: ['all'],
      supportsExport: true,
    },
    {
      key: 'inventory-aging',
      label: 'Inventory Aging',
      defaultFilters: { dateRange: 'last_90_days', region: 'all', status: 'active' },
      supportedPlatforms: ['shopify', 'amazon', 'woocommerce'],
      supportsExport: true,
    },
    {
      key: 'order-fulfillment-health',
      label: 'Order Fulfillment Health',
      defaultFilters: { dateRange: 'last_14_days', region: 'all', status: 'open' },
      supportedPlatforms: ['all'],
      supportsExport: false,
    },
  ];

  private readonly runsByWorkspace = new Map<string, ReportRunRecord[]>();

  listReports() {
    return this.reports;
  }

  runReport(input: RunReportInput) {
    const report = this.reports.find((item) => item.key === input.key);

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const normalizedFilters: ReportFilterSet = {
      dateRange: input.filters?.dateRange ?? report.defaultFilters.dateRange,
      region: input.filters?.region ?? report.defaultFilters.region,
      status: input.filters?.status ?? report.defaultFilters.status,
    };

    const run: ReportRunRecord = {
      id: `run_${Date.now().toString(36)}`,
      workspaceId: input.workspaceId,
      reportKey: report.key,
      filters: normalizedFilters,
      status: 'completed',
      output: {
        rows: this.estimateRowsForReport(report.key),
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

  private estimateRowsForReport(key: ReportKey): number {
    switch (key) {
      case 'sales-summary':
        return 48;
      case 'inventory-aging':
        return 112;
      case 'order-fulfillment-health':
        return 32;
      default:
        return 0;
    }
  }
}
