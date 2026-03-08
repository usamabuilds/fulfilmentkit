import { Controller, Get, Req } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { toListResponse } from '../common/utils/list-response';
import { apiResponse } from '../common/utils/api-response';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  async list(@Req() req: any) {
    const workspaceId = req.workspaceId;

    const items = await this.locationsService.list(workspaceId);

    return apiResponse(
      toListResponse({
      items,
      total: items.length,
      page: 1,
      pageSize: items.length,
      }),
    );
  }
}
