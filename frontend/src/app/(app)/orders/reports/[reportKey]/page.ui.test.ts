import assert from 'node:assert/strict'
import { resolveReportDetailViewState } from './report-detail-view-state'

function resolveActionUiState(reportSupportStatus: 'supported' | 'partial' | 'unsupported', supportReason: string | null) {
  const actionsDisabled = reportSupportStatus === 'unsupported'

  return {
    actionsDisabled,
    runButtonDisabled: actionsDisabled,
    exportButtonDisabled: actionsDisabled,
    unsupportedBannerText: actionsDisabled ? supportReason : null,
  }
}

function runUiTests() {
  assert.equal(
    resolveReportDetailViewState({ reportsLoading: true, reportExists: false, reportSupportStatus: 'supported' }),
    'loading',
  )
  assert.equal(
    resolveReportDetailViewState({ reportsLoading: false, reportExists: false, reportSupportStatus: 'supported' }),
    'not_found',
  )
  assert.equal(
    resolveReportDetailViewState({ reportsLoading: false, reportExists: true, reportSupportStatus: 'unsupported' }),
    'unsupported',
  )
  assert.equal(
    resolveReportDetailViewState({ reportsLoading: false, reportExists: true, reportSupportStatus: 'partial' }),
    'partial',
  )
  assert.equal(
    resolveReportDetailViewState({ reportsLoading: false, reportExists: true, reportSupportStatus: 'supported' }),
    'success',
  )

  const unsupportedUiState = resolveActionUiState('unsupported', 'Meta Ads is not connected for this workspace.')
  assert.equal(unsupportedUiState.runButtonDisabled, true)
  assert.equal(unsupportedUiState.exportButtonDisabled, true)
  assert.equal(unsupportedUiState.unsupportedBannerText, 'Meta Ads is not connected for this workspace.')

  const partialUiState = resolveActionUiState('partial', 'TikTok data is only available from 2025-01-01 onward.')
  assert.equal(partialUiState.runButtonDisabled, false)
  assert.equal(partialUiState.exportButtonDisabled, false)
  assert.equal(partialUiState.unsupportedBannerText, null)
}

runUiTests()
console.log('report detail UI state tests passed')
