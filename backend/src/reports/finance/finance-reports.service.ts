import { Injectable } from '@nestjs/common';
import { type ReportComputationOutput, type ReportFiltersByKey } from '../../orders/reporting/orders-reports.service';

@Injectable()
export class FinanceReportsService {
  runSalesSummary(filters: ReportFiltersByKey['sales-summary']): ReportComputationOutput {
    return {
      rows: 0,
      chartRows: [],
      summary: `Sales Summary is not currently implemented for ${filters.dateRange}.`,
    };
  }
}
