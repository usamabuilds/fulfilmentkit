import assert from 'node:assert/strict';
import test from 'node:test';
import { attachCapabilityMetadata } from './report-support-metadata';

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
    'items-bought-together-report-runner',
    'capability:supports_subscriptions',
  ]);
});
