'use client'

import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  type ReportPlatform,
  normalizedReportPlatforms,
  reportsApi,
  type ReportDefinitionDto,
  type ReportFilterDefinitionMapDto,
  type ReportFilterDefinitionDto,
  type ReportRunDto,
} from '@/lib/api/endpoints/reports'
import { connectionPlatforms, connectionsApi, type ConnectionPlatform } from '@/lib/api/endpoints/connections'
import { useWorkspaceStore } from '@/lib/store/workspaceStore'
import { resolveReportDetailViewState, type ReportSupportStatus } from './report-detail-view-state'

type FilterValue = string | number | string[]
type FilterState = Record<string, FilterValue>
type PlatformSelection = ReportPlatform[]

const reportsBasePath = '/orders/reports'

function getDefaultFilterState(definitions: ReportFilterDefinitionMapDto): FilterState {
  return Object.entries(definitions).reduce<FilterState>((acc, [fieldKey, definition]) => {
    acc[fieldKey] = definition.default
    return acc
  }, {})
}

function parseFiltersFromParams(searchParams: URLSearchParams, definitions: ReportFilterDefinitionMapDto): FilterState {
  const defaults = getDefaultFilterState(definitions)
  const parsed: FilterState = { ...defaults }

  Object.entries(definitions).forEach(([fieldKey, definition]) => {
    const paramValue = searchParams.get(fieldKey)
    if (!paramValue) {
      return
    }

    if (definition.type === 'number') {
      const parsedNumber = Number(paramValue)
      if (!Number.isNaN(parsedNumber)) {
        parsed[fieldKey] = parsedNumber
      }
      return
    }

    if (definition.type === 'multi-select') {
      const values = paramValue
        .split(',')
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
      if (values.length > 0) {
        parsed[fieldKey] = values
      }
      return
    }

    parsed[fieldKey] = paramValue
  })

  return parsed
}

function toQueryString(definitions: ReportFilterDefinitionMapDto, filters: FilterState): string {
  const params = new URLSearchParams()

  Object.entries(definitions).forEach(([fieldKey, definition]) => {
    const value = filters[fieldKey]

    if (definition.type === 'multi-select' && Array.isArray(value)) {
      if (value.length > 0) {
        params.set(fieldKey, value.join(','))
      }
      return
    }

    if (definition.type === 'number' && typeof value === 'number') {
      params.set(fieldKey, String(value))
      return
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      params.set(fieldKey, value)
    }
  })

  return params.toString()
}

function getInputLabel(definition: ReportFilterDefinitionDto): string {
  return definition.description ? `${definition.label} (${definition.description})` : definition.label
}

function normalizePlatformValues(value: FilterValue | undefined): PlatformSelection {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? [value] : ['all']
  const normalized = values
    .map((item) => item.toLowerCase())
    .filter((item): item is ReportPlatform => normalizedReportPlatforms.includes(item as ReportPlatform))
  if (normalized.includes('all') || normalized.length === 0) {
    return ['all']
  }
  return Array.from(new Set(normalized))
}

function validateFilters(filters: FilterState, definitions: ReportFilterDefinitionMapDto): string | null {
  const fieldEntries = Object.entries(definitions)

  for (const [fieldKey, definition] of fieldEntries) {
    const value = filters[fieldKey]

    if (definition.type === 'number') {
      if (typeof value !== 'number' || Number.isNaN(value)) {
        return `${definition.label} must be a valid number.`
      }
      if (typeof definition.min === 'number' && value < definition.min) {
        return `${definition.label} must be at least ${definition.min}.`
      }
      if (typeof definition.max === 'number' && value > definition.max) {
        return `${definition.label} must be at most ${definition.max}.`
      }
      continue
    }

    if (definition.type === 'multi-select') {
      if (!Array.isArray(value) || value.length === 0) {
        return `${definition.label} requires at least one selection.`
      }
      if (typeof definition.maxSelections === 'number' && value.length > definition.maxSelections) {
        return `${definition.label} allows up to ${definition.maxSelections} selections.`
      }
      continue
    }

    if (typeof value !== 'string') {
      return `${definition.label} is invalid.`
    }

    if (definition.type === 'text') {
      const trimmedValue = value.trim()
      if (typeof definition.minLength === 'number' && trimmedValue.length < definition.minLength) {
        return `${definition.label} must be at least ${definition.minLength} characters.`
      }
      if (typeof definition.maxLength === 'number' && trimmedValue.length > definition.maxLength) {
        return `${definition.label} must be at most ${definition.maxLength} characters.`
      }
    }
  }

  return null
}

function getStringValue(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function getRecordValue(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }
  return value as Record<string, unknown>
}

function toSupportStatus(value: unknown): ReportSupportStatus | null {
  const normalized = getStringValue(value)?.toLowerCase()
  if (!normalized) {
    return null
  }
  if (normalized === 'supported' || normalized === 'partial' || normalized === 'unsupported') {
    return normalized
  }
  return null
}

type BlockerClassification = 'metadata' | 'runtime' | 'none'

interface ReportSupportAssessment {
  status: ReportSupportStatus
  blockerClassification: BlockerClassification
  blockerReason: string | null
  dataCoverageDisclaimer: string | null
}

interface ActionEligibility {
  isRunExportEnabled: boolean
  disabledReason: string | null
}

function getCoverageDisclaimer(runOutput: ReportRunDto['output'] | null): string | null {
  if (!runOutput || runOutput.dataCoverage.isCompleteForRange) {
    return null
  }
  return `Data is only available from ${runOutput.dataCoverage.coverageStart} to ${runOutput.dataCoverage.coverageEnd}. Pre-coverage history is never inferred.`
}

function resolveReportSupportAssessment(
  report: ReportDefinitionDto,
  runOutputRecord: Record<string, unknown> | null,
): ReportSupportAssessment {
  const runStatus = toSupportStatus(runOutputRecord?.supportStatus)
  const runReason =
    getStringValue(runOutputRecord?.supportReason) ??
    getStringValue(runOutputRecord?.unsupportedReason) ??
    getStringValue(runOutputRecord?.reason) ??
    getStringValue(runOutputRecord?.caveat)
  const metadataStatus = toSupportStatus(report.supportStatus) ?? 'supported'
  const metadataReason = getStringValue(report.supportReason)

  const finalStatus = runStatus ?? metadataStatus
  const blockerClassification: BlockerClassification =
    finalStatus === 'unsupported' ? (runStatus === 'unsupported' ? 'runtime' : 'metadata') : 'none'
  const blockerReason =
    finalStatus === 'unsupported'
      ? runReason ?? metadataReason ?? 'This report is currently unsupported for your workspace.'
      : null
  const dataCoverageDisclaimer =
    finalStatus === 'partial'
      ? runReason ??
        metadataReason ??
        'This report is partially supported. Results may not include full platform coverage for all connected sources.'
      : null

  return {
    status: finalStatus,
    blockerClassification,
    blockerReason,
    dataCoverageDisclaimer,
  }
}

function resolveActionEligibility(supportAssessment: ReportSupportAssessment): ActionEligibility {
  if (supportAssessment.status === 'unsupported') {
    return {
      isRunExportEnabled: false,
      disabledReason: supportAssessment.blockerReason,
    }
  }

  return {
    isRunExportEnabled: true,
    disabledReason: null,
  }
}

export default function ReportDetailPage() {
  const router = useRouter()
  const params = useParams<{ reportKey: string }>()
  const searchParams = useSearchParams()
  const workspaceId = useWorkspaceStore((state) => state.workspace?.id)

  const reportsQuery = useQuery({
    queryKey: ['reports', workspaceId],
    queryFn: () => reportsApi.list(),
    enabled: Boolean(workspaceId),
  })
  const connectionsQuery = useQuery({
    queryKey: ['connections', workspaceId],
    queryFn: () => connectionsApi.list(),
    enabled: Boolean(workspaceId),
  })

  const report = useMemo<ReportDefinitionDto | undefined>(() => {
    const items = reportsQuery.data?.data.items ?? []
    return items.find((item) => item.key === params.reportKey)
  }, [params.reportKey, reportsQuery.data?.data.items])

  const initialFilters = useMemo(() => {
    if (!report) {
      return null
    }
    return parseFiltersFromParams(new URLSearchParams(searchParams.toString()), report.filterDefinitions)
  }, [report, searchParams])

  const [filters, setFilters] = useState<FilterState>(initialFilters ?? {})
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    if (initialFilters) {
      setFilters(initialFilters)
    }
  }, [initialFilters])

  const runMutation = useMutation({
    mutationFn: (nextFilters: FilterState) => {
      if (!report) {
        throw new Error('Report is missing')
      }
      const normalizedPlatform = normalizePlatformValues(nextFilters.platform)
      return reportsApi.run(report.key, {
        filters: {
          ...nextFilters,
          platform: normalizedPlatform,
        },
      })
    },
    onSuccess: (result) => {
      const caveat = result.data.output.caveat
      if (caveat) {
        setFeedbackMessage({
          type: 'error',
          message: caveat,
        })
        return
      }
      setFeedbackMessage(null)
    },
    onError: (error) => {
      setFeedbackMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to run report.',
      })
    },
  })
  const exportMutation = useMutation({
    mutationFn: (nextFilters: FilterState) => {
      if (!report) {
        throw new Error('Report is missing')
      }
      const validationMessage = validateFilters(nextFilters, report.filterDefinitions)
      if (validationMessage) {
        throw new Error(validationMessage)
      }

      const normalizedPlatform = normalizePlatformValues(nextFilters.platform)
      return reportsApi.exportExcel(report.key, {
        filters: {
          ...nextFilters,
          platform: normalizedPlatform,
        },
      })
    },
    onSuccess: (result) => {
      const downloadUrl = window.URL.createObjectURL(result.blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = result.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)

      if (result.isEmpty) {
        setFeedbackMessage({
          type: 'success',
          message:
            result.message ?? 'Excel export downloaded with metadata only because no rows matched your selected filters.',
        })
        return
      }

      setFeedbackMessage({
        type: 'success',
        message: result.message ?? 'Excel export downloaded successfully.',
      })
    },
    onError: (error) => {
      setFeedbackMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to export Excel file.',
      })
    },
  })

  if (reportsQuery.isLoading) {
    return <div className="glass-panel p-6 text-body text-text-secondary">Loading report metadata…</div>
  }

  if (!report) {
    return (
      <div className="glass-panel p-6">
        <p className="text-body text-text-secondary">Report not found.</p>
      </div>
    )
  }


  const activeConnectionPlatforms = (connectionsQuery.data?.data.items ?? [])
    .filter((connection) => connection.status === 'active')
    .map((connection) => connection.platform.toLowerCase())
    .filter((platform): platform is ConnectionPlatform => connectionPlatforms.includes(platform as ConnectionPlatform))
  const availablePlatforms: PlatformSelection =
    report.supportedPlatforms.includes('all')
      ? ['all', ...Array.from(new Set(activeConnectionPlatforms))]
      : ['all', ...report.supportedPlatforms.filter((platform) => platform !== 'all')]
  const selectedPlatforms = normalizePlatformValues(filters.platform)

  const syncQueryParams = (nextFilters: FilterState) => {
    const queryString = toQueryString(report.filterDefinitions, nextFilters)
    const reportDetailPath = `${reportsBasePath}/${report.key}`
    router.replace(queryString.length > 0 ? `${reportDetailPath}?${queryString}` : reportDetailPath)
  }

  const handleStringFilterChange = (fieldKey: string) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const nextValue = event.target.value
    setFilters((current) => {
      const next = { ...current, [fieldKey]: nextValue }
      syncQueryParams(next)
      return next
    })
  }

  const handleNumberFilterChange = (fieldKey: string) => (event: ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value
    const parsedNumber = Number(rawValue)

    setFilters((current) => {
      const next = { ...current, [fieldKey]: Number.isNaN(parsedNumber) ? 0 : parsedNumber }
      syncQueryParams(next)
      return next
    })
  }

  const handleMultiSelectChange = (fieldKey: string) => (event: ChangeEvent<HTMLSelectElement>) => {
    const values = Array.from(event.target.selectedOptions).map((option) => option.value)
    setFilters((current) => {
      const next = { ...current, [fieldKey]: values }
      syncQueryParams(next)
      return next
    })
  }
  const handlePlatformChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const values = Array.from(event.target.selectedOptions).map((option) => option.value)
    const normalized = normalizePlatformValues(values)
    setFilters((current) => {
      const next = { ...current, platform: normalized }
      syncQueryParams(next)
      return next
    })
  }

  const run = runMutation.data?.data
  const runRecord = getRecordValue(run)
  const runOutputRecord = getRecordValue(runRecord?.output)
  const supportAssessment = resolveReportSupportAssessment(report, runOutputRecord)
  const actionEligibility = resolveActionEligibility(supportAssessment)
  const viewState = resolveReportDetailViewState({
    reportsLoading: false,
    reportExists: true,
    reportSupportStatus: supportAssessment.status,
  })

  const isUnsupported = viewState === 'unsupported'
  const isPartial = viewState === 'partial'
  const executionDisabledReason = actionEligibility.disabledReason
  const coverageDisclaimer = run ? getCoverageDisclaimer(run.output) : null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-title-1 text-text-primary">{report.label}</h1>
          <p className="mt-1 text-body text-text-secondary">Configure filters and run this orders report on demand.</p>
        </div>
        <Link
          href={reportsBasePath}
          className="rounded-[8px] bg-black/5 px-4 py-2 text-callout text-text-secondary transition-colors hover:bg-black/10"
        >
          Back to Orders Reports
        </Link>
      </div>

      <div className="glass-panel p-6">
        {isUnsupported && executionDisabledReason && (
          <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-caption-1 uppercase tracking-wide text-destructive">Unsupported report</p>
            <p className="mt-2 text-body text-text-primary">{executionDisabledReason}</p>
          </div>
        )}
        {isPartial && supportAssessment.dataCoverageDisclaimer && (
          <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
            <p className="text-caption-1 uppercase tracking-wide text-text-tertiary">Partial platform coverage</p>
            <p className="mt-2 text-footnote text-text-secondary">{supportAssessment.dataCoverageDisclaimer}</p>
          </div>
        )}

        <h2 className="text-headline text-text-primary">Execution Filters</h2>
        <div className="mt-4">
          <label className="flex flex-col gap-2">
            <span className="text-subhead text-text-secondary">Platform (one or many)</span>
            <select
              multiple
              value={selectedPlatforms}
              onChange={handlePlatformChange}
              className="glass-input min-h-[120px] text-text-primary"
            >
              {availablePlatforms.map((platform) => (
                <option key={platform} value={platform}>
                  {platform === 'all' ? 'All platforms' : platform.charAt(0).toUpperCase() + platform.slice(1)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {Object.entries(report.filterDefinitions)
            .filter(([fieldKey]) => fieldKey !== 'platform')
            .map(([fieldKey, definition]) => {
            if (definition.type === 'date-range' || definition.type === 'select') {
              return (
                <label key={fieldKey} className="flex flex-col gap-2">
                  <span className="text-subhead text-text-secondary">{getInputLabel(definition)}</span>
                  <select
                    value={typeof filters[fieldKey] === 'string' ? filters[fieldKey] : definition.default}
                    onChange={handleStringFilterChange(fieldKey)}
                    className="glass-input text-text-primary"
                  >
                    {definition.type === 'date-range' &&
                      definition.presets.map((preset) => (
                        <option key={preset} value={preset}>
                          {preset.replaceAll('_', ' ')}
                        </option>
                      ))}
                    {definition.type === 'select' &&
                      definition.options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                  </select>
                </label>
              )
            }

            if (definition.type === 'multi-select') {
              return (
                <label key={fieldKey} className="flex flex-col gap-2">
                  <span className="text-subhead text-text-secondary">{getInputLabel(definition)}</span>
                  <select
                    multiple
                    value={Array.isArray(filters[fieldKey]) ? filters[fieldKey] : definition.default}
                    onChange={handleMultiSelectChange(fieldKey)}
                    className="glass-input min-h-[120px] text-text-primary"
                  >
                    {definition.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              )
            }

            if (definition.type === 'number') {
              return (
                <label key={fieldKey} className="flex flex-col gap-2">
                  <span className="text-subhead text-text-secondary">{getInputLabel(definition)}</span>
                  <input
                    type="number"
                    value={typeof filters[fieldKey] === 'number' ? filters[fieldKey] : definition.default}
                    onChange={handleNumberFilterChange(fieldKey)}
                    min={definition.min}
                    max={definition.max}
                    className="glass-input text-text-primary"
                  />
                </label>
              )
            }

            return (
              <label key={fieldKey} className="flex flex-col gap-2">
                <span className="text-subhead text-text-secondary">{getInputLabel(definition)}</span>
                <input
                  type="text"
                  value={typeof filters[fieldKey] === 'string' ? filters[fieldKey] : definition.default}
                  onChange={handleStringFilterChange(fieldKey)}
                  minLength={definition.minLength}
                  maxLength={definition.maxLength}
                  className="glass-input text-text-primary"
                />
              </label>
            )
            })}
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => runMutation.mutate(filters)}
            className="rounded-lg bg-black px-4 py-2 text-callout text-white transition hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={runMutation.isPending || !actionEligibility.isRunExportEnabled}
            aria-disabled={runMutation.isPending || !actionEligibility.isRunExportEnabled}
            title={executionDisabledReason ?? undefined}
          >
            {runMutation.isPending ? 'Running…' : 'Run report'}
          </button>
          {report.supportsExport && (
            <button
              type="button"
              onClick={() => exportMutation.mutate(filters)}
              className="rounded-lg border border-border-subtle px-4 py-2 text-callout text-text-secondary transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={exportMutation.isPending || !actionEligibility.isRunExportEnabled}
              aria-disabled={exportMutation.isPending || !actionEligibility.isRunExportEnabled}
              title={executionDisabledReason ?? undefined}
            >
              {exportMutation.isPending ? 'Exporting…' : 'Export Excel'}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              const defaults = getDefaultFilterState(report.filterDefinitions)
              setFilters(defaults)
              syncQueryParams(defaults)
            }}
            className="rounded-lg border border-border-subtle px-4 py-2 text-callout text-text-secondary transition hover:bg-black/5"
          >
            Reset filters
          </button>
        </div>
        {feedbackMessage && (
          <p className={`mt-3 text-footnote ${feedbackMessage.type === 'success' ? 'text-success' : 'text-destructive'}`}>
            {feedbackMessage.message}
          </p>
        )}
        {coverageDisclaimer && (
          <div className="mt-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
            <p className="text-caption-1 uppercase tracking-wide text-text-tertiary">Coverage window</p>
            <p className="mt-2 text-footnote text-text-secondary">{coverageDisclaimer}</p>
          </div>
        )}
      </div>

      <div className="glass-panel p-6">
        <h2 className="text-headline text-text-primary">Run Output</h2>
        {run && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-caption-1 text-text-tertiary">Platforms</span>
            {normalizePlatformValues(run.filters.platform).map((platform) => (
              <span
                key={platform}
                className="rounded-full border border-border-subtle bg-black/5 px-3 py-1 text-caption-1 text-text-secondary"
              >
                {platform === 'all' ? 'All platforms' : platform.charAt(0).toUpperCase() + platform.slice(1)}
              </span>
            ))}
          </div>
        )}
        {!run && <p className="mt-2 text-body text-text-secondary">No run yet. Configure filters and run this report.</p>}

        {run && run.output.rows === 0 && (
          <div className="mt-4">
            <EmptyState
              title="No rows returned"
              subtitle="Try broadening your filters or resetting to defaults and running again."
            />
          </div>
        )}

        {run && run.output.rows > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border-subtle p-4">
              <p className="text-caption-1 text-text-tertiary">Rows</p>
              <p className="text-title-3 text-text-primary">{run.output.rows}</p>
            </div>
            <div className="rounded-lg border border-border-subtle p-4 sm:col-span-2">
              <p className="text-caption-1 text-text-tertiary">Summary</p>
              <p className="text-body text-text-primary">{run.output.summary}</p>
              {run.output.caveat && <p className="mt-2 text-footnote text-destructive">{run.output.caveat}</p>}
              <p className="mt-1 text-caption-1 text-text-tertiary">Generated {new Date(run.output.generatedAt).toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
