import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ZodError } from 'zod';
import { OrdersReportsController } from './orders-reports.controller';

function createController() {
  const listReportsResult = [
    {
      key: 'sales-summary',
      label: 'Sales Summary',
      supportStatus: 'unsupported',
      supportReason: 'Execution is not implemented yet.',
      requiredFeatures: ['sales-summary-report-runner'],
      defaultFilters: {
        platform: ['all'],
      },
      filterDefinitions: {},
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
      },
      filterDefinitions: {},
      supportedPlatforms: ['all'],
      supportsExport: true,
    },
    {
      key: 'items-bought-together',
      label: 'Items Bought Together',
      supportStatus: 'partial',
      supportReason: 'Variant grouping mode is currently unavailable.',
      requiredFeatures: ['items-bought-together-report-runner', 'order-item-variant-identifiers'],
      defaultFilters: {
        platform: ['all'],
        itemGroupingLevel: 'product',
      },
      filterDefinitions: {},
      supportedPlatforms: ['all'],
      supportsExport: true,
    },
  ];

  const runReportCalls: Array<Record<string, unknown>> = [];
  const exportReportCalls: Array<Record<string, unknown>> = [];
  const getRunCalls: Array<Record<string, unknown>> = [];

  const runReportResult = {
    id: 'run-1',
    reportKey: 'sales-summary',
    status: 'completed',
    filters: {
      platform: ['shopify'],
      minRevenue: 10,
    },
    output: {
      rows: 0,
      summary: 'Sales Summary is not currently implemented for last_30_days.',
      caveat: 'Execution is not implemented yet.',
      supportStatus: 'unsupported',
      supportReason: 'Execution is not implemented yet.',
      generatedAt: '2026-03-31T00:00:00.000Z',
    },
    createdAt: '2026-03-31T00:00:00.000Z',
  };

  const exportResult = {
    filename: 'sales-summary.xlsx',
    file: Buffer.from('xlsx-bytes'),
    runId: 'run-1',
    isEmpty: false,
    message: 'ok',
  };

  const getRunResult = runReportResult;

  const salesSummaryFilterDefinitionMap = {
    platform: {
      type: 'multi-select',
      options: [
        { value: 'all', label: 'All platforms' },
        { value: 'shopify', label: 'Shopify' },
      ],
      default: ['all'],
    },
    minRevenue: {
      type: 'number',
      default: 0,
      min: 0,
      max: 100,
    },
    searchTerm: {
      type: 'text',
      default: '',
      minLength: 0,
      maxLength: 10,
    },
  };

  const itemsBoughtTogetherFilterDefinitionMap = {
    platform: {
      type: 'multi-select',
      options: [
        { value: 'all', label: 'All platforms' },
        { value: 'amazon', label: 'Amazon' },
      ],
      default: ['all'],
    },
    combinationSize: {
      type: 'select',
      default: '2',
      options: [
        { value: '2', label: 'Pairs' },
        { value: '3', label: 'Triples' },
      ],
    },
  };

  const service = {
    listReports: () => listReportsResult,
    hasReportKey: (key: string) => ['sales-summary', 'orders-over-time', 'items-bought-together'].includes(key),
    getFilterDefinitionMap: (key: string) =>
      key === 'items-bought-together' ? itemsBoughtTogetherFilterDefinitionMap : salesSummaryFilterDefinitionMap,
    runReport: (input: Record<string, unknown>) => {
      runReportCalls.push(input);
      return runReportResult;
    },
    exportReport: async (input: Record<string, unknown>) => {
      exportReportCalls.push(input);
      return exportResult;
    },
    getRun: (input: Record<string, unknown>) => {
      getRunCalls.push(input);
      return getRunResult;
    },
  };

  return {
    controller: new OrdersReportsController(service as never),
    listReportsResult,
    runReportCalls,
    exportReportCalls,
    getRunCalls,
    runReportResult,
    exportResult,
    getRunResult,
  };
}

test('listReports returns same report definitions in standard success envelope', async () => {
  const { controller, listReportsResult } = createController();

  const response = await controller.listReports();

  assert.equal(response.success, true);
  assert.deepEqual(response.data.items, listReportsResult);
  assert.equal(response.data.total, listReportsResult.length);
  assert.equal(response.data.page, 1);
  assert.equal(response.data.pageSize, listReportsResult.length);
  assert.deepEqual(
    response.data.items.map((item) => ({ key: item.key, supportStatus: item.supportStatus })),
    [
      { key: 'sales-summary', supportStatus: 'unsupported' },
      { key: 'orders-over-time', supportStatus: 'supported' },
      { key: 'items-bought-together', supportStatus: 'partial' },
    ],
  );
  assert.equal(response.data.items[0].supportReason, 'Execution is not implemented yet.');
  assert.equal(response.data.items[2].supportReason, 'Variant grouping mode is currently unavailable.');
});

test('runReport validates payload and returns run payload in response envelope', async () => {
  const { controller, runReportCalls, runReportResult } = createController();

  await assert.rejects(
    () =>
      controller.runReport(
        { workspaceId: 'ws-1' },
        'sales-summary',
        {
          filters: {
            minRevenue: -1,
          },
        },
      ),
    (error: unknown) => {
      assert.ok(error instanceof ZodError);
      return true;
    },
  );

  await assert.rejects(
    () =>
      controller.runReport(
        { workspaceId: 'ws-1' },
        'sales-summary',
        {
          filters: {
            searchTerm: 'way-too-long-search-term',
          },
        },
      ),
    (error: unknown) => {
      assert.ok(error instanceof ZodError);
      return true;
    },
  );

  await assert.rejects(
    () =>
      controller.runReport(
        { workspaceId: 'ws-1' },
        'sales-summary',
        {
          filters: {
            platform: ['unknown-platform'],
          },
        },
      ),
    (error: unknown) => {
      assert.ok(error instanceof ZodError);
      return true;
    },
  );

  const response = await controller.runReport(
    { workspaceId: 'ws-1' },
    'sales-summary',
    {
      filters: {
        platform: ['SHOPIFY'],
        minRevenue: 10,
      },
    },
  );

  assert.equal(response.success, true);
  assert.deepEqual(response.data, runReportResult);
  assert.equal(runReportCalls.length, 1);
  assert.deepEqual(runReportCalls[0], {
    workspaceId: 'ws-1',
    key: 'sales-summary',
    filters: {
      platform: ['shopify'],
      minRevenue: 10,
    },
  });
});

test('runReport accepts newly supported report keys', async () => {
  const { controller, runReportCalls } = createController();

  await controller.runReport(
    { workspaceId: 'ws-1' },
    'items-bought-together',
    {
      filters: {
        platform: ['AMAZON'],
        combinationSize: '2',
      },
    },
  );

  assert.equal(runReportCalls.length, 1);
  assert.deepEqual(runReportCalls[0], {
    workspaceId: 'ws-1',
    key: 'items-bought-together',
    filters: {
      platform: ['amazon'],
      combinationSize: '2',
    },
  });
});

test('exportReport returns xlsx headers and binary payload', async () => {
  const { controller, exportReportCalls, exportResult } = createController();
  const headers = new Map<string, string>();

  const file = await controller.exportReport(
    { workspaceId: 'ws-1' },
    {
      setHeader: (name: string, value: string) => {
        headers.set(name, value);
      },
    },
    'sales-summary',
    {
      filters: {
        platform: ['shopify'],
      },
      formatting: {
        reportSheetName: 'Sales',
      },
    },
  );

  assert.equal(exportReportCalls.length, 1);
  assert.deepEqual(exportReportCalls[0], {
    workspaceId: 'ws-1',
    key: 'sales-summary',
    filters: {
      platform: ['shopify'],
    },
    formatting: {
      reportSheetName: 'Sales',
    },
  });

  assert.equal(
    headers.get('Content-Type'),
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  assert.equal(headers.get('Content-Disposition'), `attachment; filename="${exportResult.filename}"`);
  assert.equal(headers.get('Content-Length'), String(exportResult.file.length));
  assert.equal(headers.get('X-Report-Run-Id'), exportResult.runId);
  assert.equal(headers.get('X-Report-Export-Empty'), 'false');
  assert.equal(headers.get('X-Report-Export-Message'), exportResult.message);
  assert.deepEqual(file, exportResult.file);
});

test('getReportRun retrieves run in standard success envelope', async () => {
  const { controller, getRunCalls, getRunResult } = createController();

  const response = await controller.getReportRun(
    { workspaceId: 'ws-1' },
    'sales-summary',
    'run-1',
  );

  assert.equal(response.success, true);
  assert.deepEqual(response.data, getRunResult);
  assert.equal(getRunCalls.length, 1);
  assert.deepEqual(getRunCalls[0], {
    workspaceId: 'ws-1',
    key: 'sales-summary',
    runId: 'run-1',
  });
});

test('invalid report key handling remains unchanged for run and export', async () => {
  const { controller, runReportCalls, exportReportCalls } = createController();

  await assert.rejects(
    () => controller.runReport({ workspaceId: 'ws-1' }, 'unknown-key', {}),
    (error: unknown) => {
      assert.ok(error instanceof BadRequestException);
      assert.equal(error.message, 'Invalid report key');
      return true;
    },
  );

  await assert.rejects(
    () =>
      controller.exportReport(
        { workspaceId: 'ws-1' },
        { setHeader: () => undefined },
        'unknown-key',
        {},
      ),
    (error: unknown) => {
      assert.ok(error instanceof BadRequestException);
      assert.equal(error.message, 'Invalid report key');
      return true;
    },
  );

  assert.equal(runReportCalls.length, 0);
  assert.equal(exportReportCalls.length, 0);
});

test('controller routes use the canonical /orders/reports base path', () => {
  assert.equal(Reflect.getMetadata(PATH_METADATA, OrdersReportsController), 'orders/reports');

  const prototype = OrdersReportsController.prototype;

  assert.ok(['GET', 0].includes(Reflect.getMetadata(METHOD_METADATA, prototype.listReports) as string | number));
  assert.ok([undefined, '/'].includes(Reflect.getMetadata(PATH_METADATA, prototype.listReports) as string | undefined));

  assert.ok(['POST', 1].includes(Reflect.getMetadata(METHOD_METADATA, prototype.runReport) as string | number));
  assert.equal(Reflect.getMetadata(PATH_METADATA, prototype.runReport), ':key/run');

  assert.ok(['POST', 1].includes(Reflect.getMetadata(METHOD_METADATA, prototype.exportReport) as string | number));
  assert.equal(Reflect.getMetadata(PATH_METADATA, prototype.exportReport), ':key/export');

  assert.ok(['GET', 0].includes(Reflect.getMetadata(METHOD_METADATA, prototype.getReportRun) as string | number));
  assert.equal(Reflect.getMetadata(PATH_METADATA, prototype.getReportRun), ':key/runs/:runId');
});
