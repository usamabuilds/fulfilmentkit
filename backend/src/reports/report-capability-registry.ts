export type ShopifyReportCategory =
  | 'acquisition'
  | 'behavior'
  | 'customers'
  | 'finances'
  | 'fraud'
  | 'inventory'
  | 'marketing'
  | 'orders'
  | 'performance'
  | 'profit-margin'
  | 'retail-sales'
  | 'sales'
  | 'store';

export type ReportTargetModule =
  | 'reports-acquisition'
  | 'reports-behavior'
  | 'reports-customers'
  | 'reports-finances'
  | 'reports-fraud'
  | 'reports-inventory'
  | 'reports-marketing'
  | 'reports-orders'
  | 'reports-performance'
  | 'reports-profit-margin'
  | 'reports-retail-sales'
  | 'reports-sales'
  | 'reports-store';

export type ReportSupportStatus = 'supported' | 'partial' | 'unsupported';

export type ReportBlockerClassification =
  | 'none'
  | 'not-implemented'
  | 'missing-input-data'
  | 'needs-separate-tracking-system'
  | 'needs-additional-connector-expansion'
  | 'shopify-scope-only'
  | 'deprecated'
  | 'not-documented';

export type ReportCapabilityEntry = {
  reportKey: string;
  shopifyCategory: ShopifyReportCategory;
  targetModule: ReportTargetModule;
  requiredInputs: readonly string[];
  supportStatus: ReportSupportStatus;
  blockerClassification: ReportBlockerClassification;
};

const registry = [
  // Acquisition (01)
  mk('sessions-by-referrer', 'acquisition', ['session_tracking']),
  mk('sessions-by-location', 'acquisition', ['session_tracking', 'ip_geolocation']),
  mk('sessions-over-time', 'acquisition', ['session_tracking']),
  mk('visitors-over-time', 'acquisition', ['session_tracking']),
  mk('sessions-acquisition-overview', 'acquisition', ['session_tracking'], {
    blockerClassification: 'needs-separate-tracking-system',
  }),

  // Behavior (02)
  mk('conversion-rate-breakdown', 'behavior', ['session_tracking', 'checkout_events']),
  mk('conversion-rate-over-time', 'behavior', ['session_tracking', 'checkout_events']),
  mk('conversion-funnel-storefront-events', 'behavior', ['storefront_events', 'checkout_events'], {
    blockerClassification: 'needs-additional-connector-expansion',
  }),
  mk('web-performance-reports', 'behavior', ['core_web_vitals_rum']),
  mk('product-recommendation-conversions-over-time', 'behavior', ['recommendation_events']),
  mk('product-recommendations-with-low-engagement', 'behavior', ['recommendation_events']),
  mk('searches-by-search-query', 'behavior', ['storefront_search_events']),
  mk('searches-with-no-clicks', 'behavior', ['storefront_search_events']),
  mk('searches-with-no-results', 'behavior', ['storefront_search_events']),
  mk('search-conversions-over-time', 'behavior', ['storefront_search_events', 'orders']),
  mk('sessions-by-landing-page', 'behavior', ['session_tracking']),
  mk('sessions-by-device', 'behavior', ['session_tracking', 'device_detection']),

  // Customers (03)
  mk('new-customers-over-time', 'customers', ['customers', 'orders']),
  mk('new-vs-returning-customers', 'customers', ['customers', 'orders']),
  mk('customers-by-location', 'customers', ['customers', 'shipping_addresses']),
  mk('returning-customers', 'customers', ['customers', 'orders']),
  mk('one-time-customers', 'customers', ['customers', 'orders']),
  mk('customer-cohort-analysis', 'customers', ['customers', 'orders']),
  mk('predicted-spend-tier', 'customers', ['customers', 'orders', 'ml_predictions']),
  mk('rfm-customer-analysis', 'customers', ['customers', 'orders']),
  mk('rfm-customer-list', 'customers', ['customers', 'orders']),

  // Finances (04)
  mk('finance-summary', 'finances', ['orders', 'payments', 'taxes']),
  mk('gross-sales-by-order', 'finances', ['orders']),
  mk('discounts-by-order', 'finances', ['orders', 'discounts']),
  mk('returns-by-order', 'finances', ['orders', 'refunds']),
  mk('net-sales-by-order', 'finances', ['orders', 'discounts', 'refunds']),
  mk('shipping-by-order', 'finances', ['orders', 'shipping_lines']),
  mk('taxes-report', 'finances', ['orders', 'tax_lines']),
  mk('united-states-sales-tax-report', 'finances', ['orders', 'tax_lines', 'shopify_tax']),
  mk('net-payments-by-method-over-time-by-gateway-by-order', 'finances', ['payments']),
  mk('gift-card-finance-reports', 'finances', ['gift_cards']),
  mk('tips-reports', 'finances', ['tips']),
  mk('store-credit-reports', 'finances', ['store_credit']),

  // Fraud (05)
  mk('acceptance-rate', 'fraud', ['fraud_assessments']),
  mk('chargeback-rate-fraud', 'fraud', ['chargebacks']),
  mk('chargeback-amount-fraud', 'fraud', ['chargebacks']),
  mk('high-risk-orders-rate', 'fraud', ['fraud_assessments']),
  mk('canceled-due-to-fraud', 'fraud', ['fraud_assessments', 'orders']),
  mk('chargeback-rate-overall', 'fraud', ['chargebacks']),
  mk('orders-covered-by-shopify-protect', 'fraud', ['shopify_payments_protect']),
  mk('shopify-fraud-internals', 'fraud', ['shopify_fraud_internals'], {
    blockerClassification: 'needs-additional-connector-expansion',
  }),
  mk('shopify-protect-internals', 'fraud', ['shopify_protect_internals'], {
    blockerClassification: 'needs-additional-connector-expansion',
  }),

  // Inventory (06)
  mk('month-end-inventory-snapshot', 'inventory', ['inventory_levels']),
  mk('month-end-inventory-value', 'inventory', ['inventory_levels', 'cost_per_item']),
  mk('inventory-sold-daily-by-product', 'inventory', ['inventory_levels', 'orders']),
  mk('products-by-percentage-sold', 'inventory', ['inventory_levels', 'orders']),
  mk('abc-product-analysis', 'inventory', ['inventory_levels', 'orders']),
  mk('products-by-sell-through-rate', 'inventory', ['inventory_levels', 'orders']),
  mk('inventory-remaining-per-product', 'inventory', ['inventory_levels', 'orders']),
  mk('inventory-adjustment-changes', 'inventory', ['inventory_adjustments']),
  mk('inventory-adjustments-by-count', 'inventory', ['inventory_adjustments']),

  // Marketing (07)
  mk('sales-attributed-to-marketing', 'marketing', ['orders', 'utm_attribution']),
  mk('sessions-attributed-to-marketing-campaigns', 'marketing', ['sessions', 'utm_attribution']),
  mk('top-channel-performance-report', 'marketing', ['orders', 'sessions', 'utm_attribution']),
  mk('channel-performance-report', 'marketing', ['orders', 'sessions', 'utm_attribution']),
  mk('campaigns-report', 'marketing', ['orders', 'sessions', 'utm_attribution']),
  mk('campaign-attribution-report', 'marketing', ['orders', 'sessions', 'utm_attribution']),
  mk('performance-by-referring-channel', 'marketing', ['orders', 'sessions', 'attribution_model']),
  mk('performance-by-marketing-activity', 'marketing', ['orders', 'sessions', 'utm_attribution']),
  mk('performance-by-utm-campaign', 'marketing', ['orders', 'sessions', 'utm_attribution']),
  mk('conversion-by-attribution-model', 'marketing', ['orders', 'sessions', 'attribution_model'], {
    blockerClassification: 'deprecated',
  }),
  mk('marketing-activity-reports', 'marketing', ['orders', 'sessions', 'marketing_activities']),

  // Orders (08)
  mk('sales-summary', 'orders', ['orders'], {
    blockerClassification: 'not-implemented',
  }),
  mk('inventory-aging', 'orders', ['inventory_levels', 'orders'], {
    blockerClassification: 'not-implemented',
  }),
  mk('order-fulfillment-health', 'orders', ['fulfillments', 'shipments', 'orders'], {
    blockerClassification: 'not-implemented',
  }),
  mk('orders-reversals-by-product', 'orders', ['orders', 'order_items', 'refunds'], {
    supportStatus: 'supported',
    blockerClassification: 'none',
  }),
  mk('orders-over-time', 'orders', ['orders', 'order_items'], {
    supportStatus: 'supported',
    blockerClassification: 'none',
  }),
  mk('shipping-delivery-performance', 'orders', ['orders', 'fulfillments', 'shipments'], {
    supportStatus: 'supported',
    blockerClassification: 'none',
  }),
  mk('orders-fulfilled-over-time', 'orders', ['orders', 'fulfillments'], {
    supportStatus: 'supported',
    blockerClassification: 'none',
  }),
  mk('shipping-labels-over-time', 'orders', ['orders', 'shipping_labels'], {
    supportStatus: 'supported',
    blockerClassification: 'none',
  }),
  mk('shipping-labels-by-order', 'orders', ['orders', 'shipping_labels'], {
    supportStatus: 'supported',
    blockerClassification: 'none',
  }),
  mk('items-bought-together', 'orders', ['orders', 'order_items', 'variant_ids'], {
    supportStatus: 'partial',
    blockerClassification: 'missing-input-data',
  }),

  // Performance (09)
  mk('largest-contentful-paint-over-time', 'performance', ['core_web_vitals_rum']),
  mk('interaction-to-next-paint-over-time', 'performance', ['core_web_vitals_rum']),
  mk('cumulative-layout-shift-over-time', 'performance', ['core_web_vitals_rum']),
  mk('largest-contentful-paint-page-url', 'performance', ['core_web_vitals_rum']),
  mk('interaction-to-next-paint-page-url', 'performance', ['core_web_vitals_rum']),
  mk('cumulative-layout-shift-page-url', 'performance', ['core_web_vitals_rum']),
  mk('largest-contentful-paint-page-type', 'performance', ['core_web_vitals_rum']),
  mk('interaction-to-next-paint-page-type', 'performance', ['core_web_vitals_rum']),
  mk('cumulative-layout-shift-page-type', 'performance', ['core_web_vitals_rum']),
  mk('core-web-vitals-without-rum-connector', 'performance', ['core_web_vitals_rum'], {
    blockerClassification: 'needs-separate-tracking-system',
  }),

  // Profit margin (10)
  mk('average-profit-margin-by-market', 'profit-margin', ['orders', 'cost_per_item']),
  mk('gross-profit-by-product', 'profit-margin', ['orders', 'cost_per_item']),
  mk('gross-profit-by-product-variant', 'profit-margin', ['orders', 'cost_per_item']),
  mk('gross-profit-by-pos-location', 'profit-margin', ['orders', 'cost_per_item', 'pos_locations']),
  mk('profit-margin-by-order', 'profit-margin', ['orders', 'cost_per_item']),

  // Retail sales (11)
  mk('pos-total-sales-by-product', 'retail-sales', ['pos_orders']),
  mk('pos-total-sales-by-product-variant', 'retail-sales', ['pos_orders']),
  mk('pos-total-sales-by-vendor', 'retail-sales', ['pos_orders']),
  mk('pos-total-sales-by-product-type', 'retail-sales', ['pos_orders']),
  mk('total-sales-by-pos-location', 'retail-sales', ['pos_orders', 'pos_locations']),
  mk('pos-total-sales-by-staff-member', 'retail-sales', ['pos_orders', 'staff_attribution']),
  mk('pos-staff-daily-sales-total', 'retail-sales', ['pos_orders', 'staff_attribution']),

  // Sales (12)
  mk('total-sales-by-product', 'sales', ['orders', 'order_items']),
  mk('total-sales-by-product-variant', 'sales', ['orders', 'order_items']),
  mk('total-sales-by-vendor', 'sales', ['orders', 'order_items']),
  mk('sales-by-discount-codes', 'sales', ['orders', 'discounts']),
  mk('total-sales-by-referrer', 'sales', ['orders', 'referrer_attribution']),
  mk('total-sales-by-billing-location', 'sales', ['orders', 'billing_address']),
  mk('total-sales-by-currency', 'sales', ['orders', 'currency']),
  mk('total-sales-by-sales-channel', 'sales', ['orders', 'sales_channel']),
  mk('sales-by-customer-name', 'sales', ['orders', 'customers']),
  mk('average-order-value-over-time', 'sales', ['orders']),
  mk('bundle-total-sales-over-time', 'sales', ['orders', 'bundle_components']),
  mk('total-sales-by-bundle', 'sales', ['orders', 'bundle_components']),
  mk('total-sales-by-bundle-component', 'sales', ['orders', 'bundle_components']),
  mk('bundle-component-and-product-comparison', 'sales', ['orders', 'bundle_components']),
  mk('active-subscriptions-over-time', 'sales', ['subscriptions']),
  mk('canceled-subscriptions-over-time', 'sales', ['subscriptions']),
  mk('new-subscriptions-over-time', 'sales', ['subscriptions']),
  mk('subscription-sales-over-time', 'sales', ['subscriptions', 'orders']),
  mk('subscription-vs-one-time-sales', 'sales', ['subscriptions', 'orders']),

  // Store (13)
  mk('store-category-default-reports', 'store', [], {
    blockerClassification: 'not-documented',
  }),
] as const satisfies readonly ReportCapabilityEntry[];

export const reportCapabilityRegistry: readonly ReportCapabilityEntry[] = registry;

const byKey = new Map<string, ReportCapabilityEntry>(registry.map((entry) => [entry.reportKey, entry]));

export function getReportCapability(reportKey: string): ReportCapabilityEntry | null {
  return byKey.get(reportKey) ?? null;
}

export function resolveReportSupport(
  reportKey: string,
  availableInputs: readonly string[] = [],
): Pick<ReportCapabilityEntry, 'supportStatus' | 'blockerClassification'> {
  const capability = getReportCapability(reportKey);
  if (!capability) {
    return {
      supportStatus: 'unsupported',
      blockerClassification: 'not-implemented',
    };
  }

  if (capability.supportStatus !== 'unsupported') {
    const missingInputs = capability.requiredInputs.filter((input) => !availableInputs.includes(input));
    if (missingInputs.length === 0) {
      return {
        supportStatus: capability.supportStatus,
        blockerClassification: capability.blockerClassification,
      };
    }

    return {
      supportStatus: capability.supportStatus === 'supported' ? 'partial' : capability.supportStatus,
      blockerClassification: 'missing-input-data',
    };
  }

  return {
    supportStatus: capability.supportStatus,
    blockerClassification: capability.blockerClassification,
  };
}

export function listCapabilitiesByCategory(category: ShopifyReportCategory): ReportCapabilityEntry[] {
  return registry.filter((entry) => entry.shopifyCategory === category);
}

function mk(
  reportKey: string,
  category: ShopifyReportCategory,
  requiredInputs: readonly string[],
  overrides?: Partial<Pick<ReportCapabilityEntry, 'supportStatus' | 'blockerClassification'>>,
): ReportCapabilityEntry {
  return {
    reportKey,
    shopifyCategory: category,
    targetModule: `reports-${category}`,
    requiredInputs,
    supportStatus: overrides?.supportStatus ?? 'unsupported',
    blockerClassification: overrides?.blockerClassification ?? 'not-implemented',
  };
}
