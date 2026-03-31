import assert from 'node:assert/strict'
import { resolveReportDetailViewState } from './report-detail-view-state'

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
}

runUiTests()
console.log('report detail UI state tests passed')
