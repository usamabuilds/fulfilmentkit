import assert from 'node:assert/strict';
import test from 'node:test';
import {
  attachCapabilityMetadata,
  reportCapabilityRequirementsByKey,
} from './report-support-metadata';
import { type ReportKey } from './orders-reports.service';

test('attachCapabilityMetadata keeps report metadata when workspace has required capabilities', () => {
  const result = attachCapabilityMetadata(
    {
      key: 'shipping-delivery-performance',
      supportStatus: 'supported',
      supportReason: undefined,
      requiredFeatures: ['shipping-delivery-performance-report-runner'],
    },
    {
      supports_pos: true,
      supports_subscriptions: false,
      supports_tax_detail: false,
    },
  );

  assert.equal(result.supportStatus, 'supported');
  assert.equal(result.supportReason, undefined);
  assert.deepEqual(result.requiredFeatures, ['shipping-delivery-performance-report-runner']);
});

test('attachCapabilityMetadata downgrades support and appends deterministic missing capability metadata', () => {
  const result = attachCapabilityMetadata(
    {
      key: 'items-bought-together',
      supportStatus: 'supported',
      supportReason: 'Base support reason.',
      requiredFeatures: ['items-bought-together-report-runner'],
    },
    {
      supports_pos: false,
      supports_subscriptions: false,
      supports_tax_detail: false,
    },
  );

  assert.equal(result.supportStatus, 'partial');
  assert.equal(
    result.supportReason,
    'Base support reason. Missing workspace connection capabilities: supports_subscriptions.',
  );
  assert.deepEqual(result.requiredFeatures, [
    'capability:supports_subscriptions',
    'items-bought-together-report-runner',
  ]);
});

test('attachCapabilityMetadata degrades capability-gated reports with deterministic reason ordering', () => {
  const capabilityGatedCases: Array<{
    key: ReportKey;
    baseStatus: 'supported' | 'partial';
    expectedStatus: 'partial' | 'unsupported';
    expectedCapabilityReason: string;
  }> = [
    {
      key: 'shipping-delivery-performance',
      baseStatus: 'supported' as const,
      expectedStatus: 'partial' as const,
      expectedCapabilityReason: 'Missing workspace connection capabilities: supports_pos.',
    },
    {
      key: 'shipping-labels-over-time',
      baseStatus: 'supported' as const,
      expectedStatus: 'partial' as const,
      expectedCapabilityReason: 'Missing workspace connection capabilities: supports_pos.',
    },
    {
      key: 'shipping-labels-by-order',
      baseStatus: 'supported' as const,
      expectedStatus: 'partial' as const,
      expectedCapabilityReason: 'Missing workspace connection capabilities: supports_pos.',
    },
    {
      key: 'items-bought-together',
      baseStatus: 'partial' as const,
      expectedStatus: 'unsupported' as const,
      expectedCapabilityReason: 'Missing workspace connection capabilities: supports_subscriptions.',
    },
  ];

  for (const testCase of capabilityGatedCases) {
    const result = attachCapabilityMetadata(
      {
        key: testCase.key,
        supportStatus: testCase.baseStatus,
        supportReason: 'Base reason first.',
        requiredFeatures: ['existing-feature', 'existing-feature'],
      },
      {
        supports_pos: false,
        supports_subscriptions: false,
        supports_tax_detail: true,
      },
    );

    assert.deepEqual(reportCapabilityRequirementsByKey[testCase.key],
      testCase.key === 'items-bought-together' ? ['supports_subscriptions'] : ['supports_pos']);
    assert.equal(result.supportStatus, testCase.expectedStatus);
    assert.equal(result.supportReason, `Base reason first. ${testCase.expectedCapabilityReason}`);
    assert.deepEqual(result.requiredFeatures, [
      testCase.key === 'items-bought-together' ? 'capability:supports_subscriptions' : 'capability:supports_pos',
      'existing-feature',
    ]);
  }
});
