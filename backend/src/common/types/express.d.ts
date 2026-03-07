declare namespace Express {
  export interface Request {
    workspaceId?: string;
    user?: {
      id: string;
      role?: 'VIEWER' | 'ADMIN' | 'OWNER';
    };
  }
}
