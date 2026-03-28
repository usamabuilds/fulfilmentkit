import type { ReportDefinition, ReportKey, ReportPlatform } from './orders-reports.service';

export function normalizePlatformFilter(
  key: ReportKey,
  rawValue: ReportPlatform[] | ReportPlatform,
  reports: ReportDefinition[],
  allPlatforms: readonly ReportPlatform[],
): ReportPlatform[] {
  const values = Array.isArray(rawValue) ? rawValue : [rawValue];
  const normalized = Array.from(new Set(values.map((value) => value.toLowerCase() as ReportPlatform)));
  const selectedValues: ReportPlatform[] = normalized.length > 0 ? normalized : ['all'];
  if (selectedValues.includes('all')) {
    return ['all'];
  }

  const report = reports.find((item) => item.key === key);
  if (!report) {
    return ['all'];
  }

  const available = report.supportedPlatforms.includes('all')
    ? allPlatforms
    : report.supportedPlatforms.filter((platform) => platform !== 'all');
  const availableSet = new Set<ReportPlatform>(available);

  const filtered = selectedValues.filter((platform) => platform !== 'all' && availableSet.has(platform));

  return filtered.length > 0 ? filtered : ['all'];
}

export function getPlatformMatchRatio(
  key: ReportKey,
  selectedPlatforms: ReportPlatform[],
  reports: ReportDefinition[],
  allPlatforms: readonly ReportPlatform[],
): number {
  const report = reports.find((item) => item.key === key);
  if (!report || selectedPlatforms.includes('all')) {
    return 1;
  }

  const reportSupportedPlatforms = report.supportedPlatforms.includes('all')
    ? allPlatforms
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
