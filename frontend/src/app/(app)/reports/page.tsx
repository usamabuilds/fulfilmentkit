import { redirect } from 'next/navigation'

type ReportsPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

function toQueryString(searchParams?: ReportsPageProps['searchParams']): string {
  if (!searchParams) {
    return ''
  }

  const params = new URLSearchParams()

  Object.entries(searchParams).forEach(([key, value]) => {
    if (typeof value === 'string') {
      params.append(key, value)
      return
    }

    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item))
    }
  })

  const query = params.toString()
  return query.length > 0 ? `?${query}` : ''
}

export default function ReportsPage({ searchParams }: ReportsPageProps) {
  redirect(`/orders/reports${toQueryString(searchParams)}`)
}
