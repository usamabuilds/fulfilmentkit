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
} from '@/lib/api/endpoints/reports'
import { connectionPlatforms, connectionsApi, type ConnectionPlatform } from '@/lib/api/endpoints/connections'
import { useWorkspaceStore } from '@/lib/store/workspaceStore'

type FilterValue = string | number | string[]
type FilterState = Record<string, FilterValue>
type PlatformSelection = ReportPlatform[]

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
    router.replace(queryString.length > 0 ? `/reports/${report.key}?${queryString}` : `/reports/${report.key}`)
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-title-1 text-text-primary">{report.label}</h1>
          <p className="mt-1 text-body text-text-secondary">Configure filters and run your report on demand.</p>
        </div>
        <Link
          href="/reports"
          className="rounded-[8px] bg-black/5 px-4 py-2 text-callout text-text-secondary transition-colors hover:bg-black/10"
        >
          Back to Reports
        </Link>
      </div>

      <div className="glass-panel p-6">
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
            disabled={runMutation.isPending}
          >
            {runMutation.isPending ? 'Running…' : 'Run report'}
          </button>
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
              <p className="mt-1 text-caption-1 text-text-tertiary">Generated {new Date(run.output.generatedAt).toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
