import { type ConnectionCapabilityFlags } from '../../connections/connections.service';
import { type ReportKey } from './orders-reports.service';

export type CapabilityKey = keyof ConnectionCapabilityFlags;

export const reportCapabilityRequirementsByKey: Partial<Record<ReportKey, readonly CapabilityKey[]>> = {
  'shipping-delivery-performance': ['supports_pos'],
  'shipping-labels-over-time': ['supports_pos'],
  'shipping-labels-by-order': ['supports_pos'],
  'items-bought-together': ['supports_subscriptions'],
};

type SupportStatus = 'supported' | 'partial' | 'unsupported';

type ReportSupportMetadata = {
  supportStatus: SupportStatus;
  supportReason?: string;
  requiredFeatures?: string[];
};

export function attachCapabilityMetadata(
  report: Readonly<
    ReportSupportMetadata & {
      key: ReportKey;
    }
  >,
  workspaceCapabilityFlags: ConnectionCapabilityFlags,
): ReportSupportMetadata {
  const requiredCapabilities = reportCapabilityRequirementsByKey[report.key] ?? [];
  const missingCapabilities = [...requiredCapabilities]
    .filter((capability) => !workspaceCapabilityFlags[capability])
    .sort();

  if (missingCapabilities.length === 0) {
    return {
      supportStatus: report.supportStatus,
      supportReason: report.supportReason,
      requiredFeatures: report.requiredFeatures,
    };
  }

  const downgradedSupportStatus = report.supportStatus === 'supported' ? 'partial' : 'unsupported';
  const capabilityBlockerReason = `Missing workspace connection capabilities: ${missingCapabilities.join(', ')}.`;
  const supportReasonParts = [report.supportReason, capabilityBlockerReason].filter(
    (value): value is string => Boolean(value && value.length > 0),
  );
  const requiredFeatures = [...new Set([
    ...(report.requiredFeatures ?? []),
    ...missingCapabilities.map((value) => `capability:${value}`),
  ])].sort();

  return {
    supportStatus: downgradedSupportStatus,
    supportReason: supportReasonParts.join(' '),
    requiredFeatures,
  };
}
