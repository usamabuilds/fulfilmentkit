import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { MetricsService } from '../../metrics/metrics.service';

@Processor('metrics')
export class MetricsWorker extends WorkerHost {
  private readonly logger = new Logger(MetricsWorker.name);

  constructor(private readonly metricsService: MetricsService) {
    super();
  }

  async process(job: Job): Promise<void> {
    const { workspaceId, dayUtc } = job.data as {
      workspaceId: string;
      dayUtc: string;
    };

    if (job.name === 'metrics:compute_daily_metrics') {
      this.logger.log(
        `Starting metrics computation for workspace=${workspaceId} day=${dayUtc}`,
      );

      await this.metricsService.computeDailyMetric({
        workspaceId,
        dayUtc: new Date(dayUtc),
      });

      this.logger.log(
        `Completed metrics computation for workspace=${workspaceId} day=${dayUtc}`,
      );

      return;
    }

    if (job.name === 'metrics:compute_sku_daily_metrics') {
      this.logger.log(
        `Starting sku metrics computation for workspace=${workspaceId} day=${dayUtc}`,
      );

      await this.metricsService.computeSkuDailyMetric({
        workspaceId,
        dayUtc: new Date(dayUtc),
      });

      this.logger.log(
        `Completed sku metrics computation for workspace=${workspaceId} day=${dayUtc}`,
      );

      return;
    }
  }
}
