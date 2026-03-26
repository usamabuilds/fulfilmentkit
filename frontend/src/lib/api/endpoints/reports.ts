import { apiGet, apiGetList, apiPost } from '@/lib/api/client'
import { connectionPlatforms, type ConnectionPlatform } from '@/lib/api/endpoints/connections'

export type ReportKey = 'sales-summary' | 'inventory-aging' | 'order-fulfillment-health'
export type ReportPlatform = ConnectionPlatform | 'all'

export type ReportFilterType = 'date-range' | 'select' | 'multi-select' | 'number' | 'text'

export interface ReportSelectOptionDto {
  value: string
  label: string
}

interface BaseFilterDefinitionDto {
  label: string
  type: ReportFilterType
  description?: string
}

export interface DateRangeFilterDefinitionDto extends BaseFilterDefinitionDto {
  type: 'date-range'
  default: string
  presets: string[]
}

export interface SelectFilterDefinitionDto extends BaseFilterDefinitionDto {
  type: 'select'
  default: string
  options: ReportSelectOptionDto[]
}

export interface MultiSelectFilterDefinitionDto extends BaseFilterDefinitionDto {
  type: 'multi-select'
  default: string[]
  options: ReportSelectOptionDto[]
  maxSelections?: number
}

export interface NumberFilterDefinitionDto extends BaseFilterDefinitionDto {
  type: 'number'
  default: number
  min?: number
  max?: number
}

export interface TextFilterDefinitionDto extends BaseFilterDefinitionDto {
  type: 'text'
  default: string
  minLength?: number
  maxLength?: number
}

export type ReportFilterDefinitionDto =
  | DateRangeFilterDefinitionDto
  | SelectFilterDefinitionDto
  | MultiSelectFilterDefinitionDto
  | NumberFilterDefinitionDto
  | TextFilterDefinitionDto

export type ReportFilterDefinitionMapDto = Record<string, ReportFilterDefinitionDto>

export interface ReportDefinitionDto {
  key: ReportKey
  label: string
  defaultFilters: Record<string, string | number | string[]>
  filterDefinitions: ReportFilterDefinitionMapDto
  supportedPlatforms: ReportPlatform[]
  supportsExport: boolean
}

export interface ReportRunDto {
  id: string
  reportKey: ReportKey
  status: 'completed'
  filters: Record<string, string | number | string[]>
  output: {
    rows: number
    summary: string
    generatedAt: string
  }
  createdAt: string
}

export interface RunReportDto {
  filters?: Record<string, string | number | string[]>
}

export const normalizedReportPlatforms = ['all', ...connectionPlatforms] as const

export const reportsApi = {
  list: () => apiGetList<ReportDefinitionDto>('/reports'),
  run: (reportKey: ReportKey, dto: RunReportDto) => apiPost<ReportRunDto>(`/reports/${reportKey}/run`, dto),
  getRun: (reportKey: ReportKey, runId: string) => apiGet<ReportRunDto>(`/reports/${reportKey}/runs/${runId}`),
}
