import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { z } from 'zod';
import { ConnectionsService } from './connections.service';
import { Roles } from '../common/auth/roles.decorator';
import { apiResponse } from '../common/utils/api-response';

const platformSchema = z.enum(['shopify', 'woocommerce', 'amazon', 'zoho', 'xero', 'sage', 'odoo', 'quickbooks']);

@Controller('connections')
export class ConnectionsController {
  constructor(private readonly connectionsService: ConnectionsService) {}

  @Get()
  async list(@Req() req: any) {
    const workspaceId = req.workspaceId as string;

    const result = await this.connectionsService.list(workspaceId);
    return apiResponse(result);
  }

  @Post(':platform/start')
  @Roles('ADMIN', 'OWNER')
  async start(@Req() req: any, @Param('platform') platformRaw: string) {
    const workspaceId = req.workspaceId as string;

    const platform = platformSchema.parse(platformRaw.toLowerCase());

    const result = await this.connectionsService.startConnectionFlow({
      workspaceId,
      platform,
    });

    return apiResponse(result.data);
  }

  @Post(':platform/callback')
  @Roles('ADMIN', 'OWNER')
  async callback(
    @Req() req: any,
    @Param('platform') platformRaw: string,
    @Body() body: any,
  ) {
    const workspaceId = req.workspaceId as string;

    const platform = platformSchema.parse(platformRaw.toLowerCase());

    const result = await this.connectionsService.handleCallback({
      workspaceId,
      platform,
      payload: body,
    });

    return apiResponse(result.data);
  }

  @Post(':id/sync')
  @Roles('ADMIN', 'OWNER')
  async sync(@Req() req: any, @Param('id') connectionId: string) {
    const workspaceId = req.workspaceId as string;

    const result = await this.connectionsService.triggerManualSync({
      workspaceId,
      connectionId,
    });

    return apiResponse(result.data);
  }

  @Get(':id/sync-runs')
  async listSyncRuns(@Req() req: any, @Param('id') connectionId: string) {
    const workspaceId = req.workspaceId as string;

    const result = await this.connectionsService.listSyncRuns({
      workspaceId,
      connectionId,
    });

    return apiResponse(result);
  }
}
