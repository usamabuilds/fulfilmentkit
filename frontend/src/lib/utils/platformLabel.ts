const platformLabels: Record<string, string> = {
  amazon: 'Amazon',
  odoo: 'Odoo',
  quickbooks: 'QuickBooks',
  sage: 'Sage',
  shopify: 'Shopify',
  woocommerce: 'WooCommerce',
  xero: 'Xero',
  zoho: 'Zoho',
}

function normalizePlatform(platform: string): string {
  return platform.trim().toLowerCase()
}

export function toPlatformLabel(platform: string, displayName?: string | null): string {
  const normalizedDisplayName = displayName?.trim()
  if (normalizedDisplayName) {
    return normalizedDisplayName
  }

  const normalizedPlatform = normalizePlatform(platform)
  if (!normalizedPlatform) {
    return ''
  }

  return (
    platformLabels[normalizedPlatform] ??
    normalizedPlatform.charAt(0).toUpperCase() + normalizedPlatform.slice(1)
  )
}
