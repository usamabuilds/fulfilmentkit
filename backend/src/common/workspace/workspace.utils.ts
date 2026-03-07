import { BadRequestException } from '@nestjs/common';

export function requireWorkspaceId(req: any): string {
  const workspaceId = req.workspaceId;

  if (!workspaceId) {
    // This should never happen if WorkspaceGuard is global
    throw new BadRequestException('Workspace scope is missing');
  }

  return workspaceId;
}
