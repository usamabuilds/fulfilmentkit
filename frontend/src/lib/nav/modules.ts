export type ModuleId = 'dashboard' | 'orders' | 'inventory' | 'connections' | 'forecast' | 'planning' | 'metrics' | 'ai' | 'settings'

export interface NavPage {
  label: string
  href: string
}

export interface NavModule {
  id: ModuleId
  label: string
  basePath: string
  pages: NavPage[]
}

export const modules: NavModule[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    basePath: '/dashboard',
    pages: [
      { label: 'Overview', href: '/dashboard' },
      { label: 'Trends', href: '/dashboard/trends' },
      { label: 'Breakdown', href: '/dashboard/breakdown' },
      { label: 'Alerts', href: '/dashboard/alerts' },
    ],
  },
  {
    id: 'orders',
    label: 'Orders',
    basePath: '/orders',
    pages: [
      { label: 'All Orders', href: '/orders' },
      { label: 'Pending', href: '/orders/pending' },
      { label: 'Fulfilled', href: '/orders/fulfilled' },
      { label: 'Cancelled', href: '/orders/cancelled' },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    basePath: '/inventory',
    pages: [
      { label: 'Stock Levels', href: '/inventory' },
      { label: 'SKUs', href: '/inventory/skus' },
      { label: 'Products', href: '/inventory/products' },
    ],
  },
  {
    id: 'connections',
    label: 'Connections',
    basePath: '/connections',
    pages: [
      { label: 'Platforms', href: '/connections' },
    ],
  },
  {
    id: 'forecast',
    label: 'Forecast',
    basePath: '/forecast',
    pages: [
      { label: 'Forecasts', href: '/forecast' },
      { label: 'Create Forecast', href: '/forecast/create' },
    ],
  },
  {
    id: 'planning',
    label: 'Planning',
    basePath: '/planning',
    pages: [
      { label: 'Plans', href: '/planning' },
      { label: 'Create Plan', href: '/planning/create' },
    ],
  },
  {
    id: 'metrics',
    label: 'Metrics',
    basePath: '/metrics',
    pages: [
      { label: 'Daily Metrics', href: '/metrics' },
      { label: 'Compute', href: '/metrics/compute' },
    ],
  },
  {
    id: 'ai',
    label: 'AI',
    basePath: '/ai',
    pages: [
      { label: 'Assistant', href: '/ai' },
      { label: 'Tool Results', href: '/ai/tools' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    basePath: '/settings',
    pages: [
      { label: 'Workspace', href: '/settings' },
      { label: 'Members', href: '/settings/members' },
    ],
  },
]
