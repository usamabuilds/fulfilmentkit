import { WorkspaceRole } from '../generated/prisma';

export const WorkspacePermissions = {
  WorkspaceManage: 'workspace.manage',
  MembersManage: 'members.manage',
  RolesManage: 'roles.manage',
  CatalogRead: 'catalog.read',
  CatalogWrite: 'catalog.write',
  InventoryRead: 'inventory.read',
  InventoryWrite: 'inventory.write',
  OrdersRead: 'orders.read',
  OrdersWrite: 'orders.write',
  ForecastRead: 'forecast.read',
  ForecastWrite: 'forecast.write',
  ConnectionsWrite: 'connections.write',
  AnalyticsView: 'analytics.view',
} as const;

export type WorkspacePermission = (typeof WorkspacePermissions)[keyof typeof WorkspacePermissions];

export const ALL_WORKSPACE_PERMISSIONS: WorkspacePermission[] = Object.values(WorkspacePermissions);

export const DEFAULT_ROLE_PERMISSIONS: Record<WorkspaceRole, WorkspacePermission[]> = {
  [WorkspaceRole.OWNER]: [
    WorkspacePermissions.WorkspaceManage,
    WorkspacePermissions.MembersManage,
    WorkspacePermissions.RolesManage,
    WorkspacePermissions.CatalogWrite,
    WorkspacePermissions.InventoryWrite,
    WorkspacePermissions.OrdersWrite,
    WorkspacePermissions.ForecastWrite,
    WorkspacePermissions.ConnectionsWrite,
    WorkspacePermissions.AnalyticsView,
  ],
  [WorkspaceRole.ADMIN]: [
    WorkspacePermissions.MembersManage,
    WorkspacePermissions.CatalogWrite,
    WorkspacePermissions.InventoryWrite,
    WorkspacePermissions.OrdersWrite,
    WorkspacePermissions.ForecastWrite,
    WorkspacePermissions.ConnectionsWrite,
    WorkspacePermissions.AnalyticsView,
  ],
  [WorkspaceRole.VIEWER]: [
    WorkspacePermissions.CatalogRead,
    WorkspacePermissions.InventoryRead,
    WorkspacePermissions.OrdersRead,
    WorkspacePermissions.ForecastRead,
    WorkspacePermissions.AnalyticsView,
  ],
};

export const LEGACY_ROLE_NAMES: Record<WorkspaceRole, string> = {
  [WorkspaceRole.OWNER]: 'Owner',
  [WorkspaceRole.ADMIN]: 'Admin',
  [WorkspaceRole.VIEWER]: 'Viewer',
};
