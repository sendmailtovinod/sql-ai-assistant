import { ScheduledReport, ReportRun } from './types'

const REPORTS_KEY = 'sql-scheduled-reports'
const RUNS_KEY = 'sql-report-runs'

export function getReports(): ScheduledReport[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(REPORTS_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function saveReport(report: ScheduledReport): void {
  const reports = getReports().filter((r) => r.id !== report.id)
  localStorage.setItem(REPORTS_KEY, JSON.stringify([...reports, report]))
}

export function deleteReport(id: string): void {
  const reports = getReports().filter((r) => r.id !== id)
  localStorage.setItem(REPORTS_KEY, JSON.stringify(reports))
}

export function getRuns(reportId: string): ReportRun[] {
  if (typeof window === 'undefined') return []
  try {
    const all: ReportRun[] = JSON.parse(localStorage.getItem(RUNS_KEY) ?? '[]')
    return all.filter((r) => r.reportId === reportId).sort((a, b) => b.startedAt - a.startedAt)
  } catch {
    return []
  }
}

export function saveRun(run: ReportRun): void {
  if (typeof window === 'undefined') return
  try {
    const all: ReportRun[] = JSON.parse(localStorage.getItem(RUNS_KEY) ?? '[]')
    const filtered = all.filter((r) => r.id !== run.id)
    localStorage.setItem(RUNS_KEY, JSON.stringify([...filtered, run]))
  } catch {
    // ignore
  }
}
