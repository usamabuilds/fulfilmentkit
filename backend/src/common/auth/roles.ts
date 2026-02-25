export type WorkspaceRole = 'VIEWER' | 'ADMIN' | 'OWNER';

export const WorkspaceRoles = {
  VIEWER: 'VIEWER',
  ADMIN: 'ADMIN',
  OWNER: 'OWNER',
} as const;
