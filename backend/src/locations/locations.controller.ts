import { Controller, Get, Req } from '@nestjs/common';
import { LocationsService } from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  async list(@Req() req: any) {
    const workspaceId = req.workspaceId;

    const items = await this.locationsService.list(workspaceId);

    return {
      items,
    };
  }
}
