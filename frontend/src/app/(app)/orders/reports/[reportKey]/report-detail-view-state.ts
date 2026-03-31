export type ReportSupportStatus = 'supported' | 'partial' | 'unsupported'
export type ReportDetailViewState = 'loading' | 'not_found' | 'unsupported' | 'partial' | 'success'

export function resolveReportDetailViewState(input: {
  reportsLoading: boolean
  reportExists: boolean
  reportSupportStatus: ReportSupportStatus
}): ReportDetailViewState {
  if (input.reportsLoading) {
    return 'loading'
  }
  if (!input.reportExists) {
    return 'not_found'
  }
  if (input.reportSupportStatus === 'unsupported') {
    return 'unsupported'
  }
  if (input.reportSupportStatus === 'partial') {
    return 'partial'
  }
  return 'success'
}
