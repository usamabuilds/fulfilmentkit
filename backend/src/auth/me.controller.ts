import { Controller, Get, Req } from '@nestjs/common';

@Controller('me')
export class MeController {
  @Get()
  async getMe(@Req() req: any) {
    return {
      success: true,
      data: {
        user: req.user ?? null,
        workspaceId: req.workspaceId ?? null,
        workspaceRole: req.workspaceRole ?? null,
      },
    };
  }
}
