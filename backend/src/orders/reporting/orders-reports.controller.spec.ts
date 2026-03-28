import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { ZodError } from 'zod';
import { OrdersReportsController } from './orders-reports.controller';

function createController() {
  const listReportsResult = [
    {
      key: 'sales-summary',
      title: 'Sales summary',
    },
  ];

  const runReportCalls: Array<Record<string, unknown>> = [];
  const exportReportCalls: Array<Record<string, unknown>> = [];
  const getRunCalls: Array<Record<string, unknown>> = [];

  const runReportResult = {
    runId: 'run-1',
    key: 'sales-summary',
    status: 'completed',
  };

  const exportResult = {
    filename: 'sales-summary.xlsx',
    file: Buffer.from('xlsx-bytes'),
    runId: 'run-1',
    isEmpty: false,
    message: 'ok',
  };

  const getRunResult = {
    runId: 'run-1',
    key: 'sales-summary',
    status: 'completed',
  };

  const filterDefinitionMap = {
    platform: {
      type: 'select',
      options: [
        { value: 'shopify', label: 'Shopify' },
        { value: 'amazon', label: 'Amazon' },
      ],
    },
  };

  const service = {
    listReports: () => listReportsResult,
    hasReportKey: (key: string) => key === 'sales-summary',
    getFilterDefinitionMap: () => filterDefinitionMap,
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
            platform: 'unsupported',
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
        platform: 'SHOPIFY',
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
      platform: 'shopify',
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
        platform: 'amazon',
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
      platform: 'amazon',
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
