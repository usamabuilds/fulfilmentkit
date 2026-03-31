import { Injectable } from '@nestjs/common';
import { type ReportComputationOutput, type ReportFiltersByKey } from '../../orders/reporting/orders-reports.service';

@Injectable()
export class InventoryReportsService {
  runInventoryAging(filters: ReportFiltersByKey['inventory-aging']): ReportComputationOutput {
    return {
      rows: 0,
      chartRows: [],
      summary: `Inventory Aging is not currently implemented for ${filters.dateRange}.`,
    };
  }
}
