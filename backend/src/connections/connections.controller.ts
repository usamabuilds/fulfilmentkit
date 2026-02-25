import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { z } from 'zod';
import { ConnectionsService } from './connections.service';

const platformSchema = z.enum(['shopify', 'woocommerce', 'amazon']);

@Controller('connections')
export class ConnectionsController {
  constructor(private readonly connectionsService: ConnectionsService) {}

  @Get()
  async list(@Req() req: any) {
    const workspaceId = req.workspaceId as string;
    return this.connectionsService.list(workspaceId);
  }

  @Post(':platform/start')
  async start(@Req() req: any, @Param('platform') platformRaw: string) {
    const workspaceId = req.workspaceId as string;

    const platform = platformSchema.parse(platformRaw.toLowerCase());

    return this.connectionsService.startConnectionFlow({
      workspaceId,
      platform,
    });
  }

  @Post(':platform/callback')
  async callback(
    @Req() req: any,
    @Param('platform') platformRaw: string,
    @Body() body: any,
  ) {
    const workspaceId = req.workspaceId as string;

    const platform = platformSchema.parse(platformRaw.toLowerCase());

    return this.connectionsService.handleCallback({
      workspaceId,
      platform,
      payload: body,
    });
  }

  @Post(':id/sync')
  async sync(@Req() req: any, @Param('id') connectionId: string) {
    const workspaceId = req.workspaceId as string;

    return this.connectionsService.triggerManualSync({
      workspaceId,
      connectionId,
    });
  }

  @Get(':id/sync-runs')
  async listSyncRuns(@Req() req: any, @Param('id') connectionId: string) {
    const workspaceId = req.workspaceId as string;

    return this.connectionsService.listSyncRuns({
      workspaceId,
      connectionId,
    });
  }
}
