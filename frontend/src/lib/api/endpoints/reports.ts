import { apiGet, apiGetList, apiPost } from '@/lib/api/client'
import { connectionPlatforms, type ConnectionPlatform } from '@/lib/api/endpoints/connections'
import { useAuthStore } from '@/lib/store/authStore'
import { useWorkspaceStore } from '@/lib/store/workspaceStore'

export type ReportKey =
  | 'sales-summary'
  | 'inventory-aging'
  | 'order-fulfillment-health'
  | 'orders-reversals-by-product'
  | 'orders-over-time'
  | 'shipping-delivery-performance'
  | 'orders-fulfilled-over-time'
  | 'shipping-labels-over-time'
  | 'shipping-labels-by-order'
  | 'items-bought-together'
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
  supportStatus: 'supported' | 'partial' | 'unsupported'
  supportReason?: string
  requiredFeatures?: string[]
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
    caveat?: string
    warnings?: string[]
    chartRows?: Array<Record<string, string | number | null>>
    supportStatus: 'supported' | 'partial' | 'unsupported'
    supportReason?: string
    generatedAt: string
  }
  createdAt: string
}

export interface RunReportDto {
  filters?: Record<string, string | number | string[]>
}

export interface ExportReportFormattingDto {
  reportSheetName?: string
  metadataSheetName?: string
  includeMetadataSheet?: boolean
}

export interface ExportReportDto {
  filters?: Record<string, string | number | string[]>
  formatting?: ExportReportFormattingDto
}

export interface ReportExportResult {
  blob: Blob
  filename: string
  runId: string | null
  isEmpty: boolean
  message: string | null
}

function getExportHeaders(): HeadersInit {
  const jwt = useAuthStore.getState().jwt
  const workspaceId = useWorkspaceStore.getState().workspace?.id
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (jwt) {
    headers.Authorization = `Bearer ${jwt}`
  }
  if (workspaceId) {
    headers['X-Workspace-Id'] = workspaceId
  }

  return headers
}

export const normalizedReportPlatforms = ['all', ...connectionPlatforms] as const


export const reportsApiPaths = {
  list: '/orders/reports',
  run: (reportKey: ReportKey) => `/orders/reports/${reportKey}/run`,
  getRun: (reportKey: ReportKey, runId: string) => `/orders/reports/${reportKey}/runs/${runId}`,
  exportExcel: (reportKey: ReportKey) => `/orders/reports/${reportKey}/export`,
}

export const reportsApi = {
  list: () => apiGetList<ReportDefinitionDto>(reportsApiPaths.list),
  run: (reportKey: ReportKey, dto: RunReportDto) => apiPost<ReportRunDto>(reportsApiPaths.run(reportKey), dto),
  getRun: (reportKey: ReportKey, runId: string) => apiGet<ReportRunDto>(reportsApiPaths.getRun(reportKey, runId)),
  exportExcel: async (reportKey: ReportKey, dto: ExportReportDto): Promise<ReportExportResult> => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL
    if (!baseUrl) {
      throw new Error('NEXT_PUBLIC_API_URL is not set')
    }

    const res = await fetch(`${baseUrl}${reportsApiPaths.exportExcel(reportKey)}`, {
      method: 'POST',
      headers: getExportHeaders(),
      body: JSON.stringify(dto),
    })

    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as
        | { message?: string; error?: { message?: string } | string }
        | null
      const nestedMessage = payload?.error && typeof payload.error === 'object' ? payload.error.message : null
      const message = nestedMessage ?? payload?.message ?? `HTTP ${res.status}`
      throw new Error(message)
    }

    const blob = await res.blob()
    const contentDisposition = res.headers.get('content-disposition')
    const fileNameMatch = contentDisposition?.match(/filename=\"?([^\";]+)\"?/)
    const filename = fileNameMatch?.[1] ?? `${reportKey}.xlsx`

    return {
      blob,
      filename,
      runId: res.headers.get('x-report-run-id'),
      isEmpty: res.headers.get('x-report-export-empty') === 'true',
      message: res.headers.get('x-report-export-message'),
    }
  },
}
