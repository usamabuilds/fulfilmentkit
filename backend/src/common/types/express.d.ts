declare namespace Express {
  export interface Request {
    workspaceId?: string;
    workspaceRole?: 'VIEWER' | 'ADMIN' | 'OWNER';
    workspaceMember?: {
      id: string;
      role: 'VIEWER' | 'ADMIN' | 'OWNER';
      roleDefinition?: {
        id: string;
        legacyRole: 'VIEWER' | 'ADMIN' | 'OWNER' | null;
        permissions: unknown;
      } | null;
    };
    user?: {
      id: string;
      role?: 'VIEWER' | 'ADMIN' | 'OWNER';
    };
  }
}
