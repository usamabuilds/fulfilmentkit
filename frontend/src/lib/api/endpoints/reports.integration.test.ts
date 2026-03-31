import assert from 'node:assert/strict'
import { reportsApi, reportsApiPaths } from './reports'
import { useAuthStore } from '@/lib/store/authStore'
import { useWorkspaceStore } from '@/lib/store/workspaceStore'

async function runIntegrationTests() {
  assert.equal(reportsApiPaths.list, '/orders/reports')
  assert.equal(reportsApiPaths.run('sales-summary'), '/orders/reports/sales-summary/run')
  assert.equal(reportsApiPaths.getRun('sales-summary', 'run-1'), '/orders/reports/sales-summary/runs/run-1')
  assert.equal(reportsApiPaths.exportExcel('sales-summary'), '/orders/reports/sales-summary/export')

  process.env.NEXT_PUBLIC_API_URL = 'https://api.fulfilmentkit.test'
  useAuthStore.setState({ jwt: 'jwt-token' })
  useWorkspaceStore.setState({ workspace: { id: 'ws-1', name: 'Main' } })

  let calledUrl = ''
  let calledMethod = ''
  let body = ''

  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    calledUrl = String(input)
    calledMethod = init?.method ?? 'GET'
    body = String(init?.body ?? '')

    const headers = new Headers({
      'content-disposition': 'attachment; filename="report.xlsx"',
      'x-report-run-id': 'run-123',
      'x-report-export-empty': 'false',
      'x-report-export-message': 'Export completed successfully.',
    })

    return new Response(new Blob(['xlsx']), {
      status: 200,
      headers,
    })
  }) as typeof fetch

  const result = await reportsApi.exportExcel('sales-summary', {
    filters: { platform: ['all'] },
  })

  assert.equal(calledUrl, 'https://api.fulfilmentkit.test/orders/reports/sales-summary/export')
  assert.equal(calledMethod, 'POST')
  assert.match(body, /platform/)
  assert.equal(result.filename, 'report.xlsx')
  assert.equal(result.runId, 'run-123')
}

runIntegrationTests()
  .then(() => {
    console.log('reports endpoint integration tests passed')
  })
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
