import {
  Body,
  Controller,
  Headers,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { z } from 'zod';
import { WebhookService } from './webhook.service';
import { apiResponse } from '../../common/utils/api-response';

const platformSchema = z.enum(['shopify', 'woocommerce', 'amazon']);

@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post(':platform')
  async receiveWebhook(
    @Req() req: any,
    @Param('platform') platformRaw: string,
    @Headers() headers: any,
    @Body() body: any,
  ) {
    const platform = platformSchema.parse(platformRaw.toLowerCase());

    const result = await this.webhookService.ingestWebhook({
      platform,
      headers,
      payload: body,
      rawBody: req.rawBody,
    });

    return apiResponse(result.data);
  }
}
