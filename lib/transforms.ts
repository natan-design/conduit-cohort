import type { CohortRow, CohortSummary, AdSpendRow } from '@/types'
import { STATIC_AD_SPEND } from '@/lib/marketing-spend'

const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
}

export function formatMonthLabel(ym: string): string {
  const [year, month] = ym.split('-')
  return `${MONTH_LABELS[month]} ${year}`
}

function monthDiff(from: string, to: string): number {
  const [fy, fm] = from.split('-').map(Number)
  const [ty, tm] = to.split('-').map(Number)
  return (ty - fy) * 12 + (tm - fm)
}

export function buildCohortSummaries(
  rows: CohortRow[],
  adSpend: AdSpendRow[]
): CohortSummary[] {
  const spendMap = new Map<string, number>(Object.entries(STATIC_AD_SPEND))

  // Group by cohort_month
  const byC = new Map<string, CohortRow[]>()
  for (const row of rows) {
    if (!byC.has(row.cohort_month)) byC.set(row.cohort_month, [])
    byC.get(row.cohort_month)!.push(row)
  }

  const summaries: CohortSummary[] = []

  for (const [cohort_month, cohortRows] of byC.entries()) {
    // Find acquisition row (order_month === cohort_month)
    const acqRow = cohortRows.find(r => r.order_month === cohort_month)
    const new_patients = acqRow?.patients ?? 0

    // Find max relative month index
    const maxIdx = Math.max(...cohortRows.map(r => monthDiff(cohort_month, r.order_month)))

    const revenue_by_month = new Array(maxIdx + 1).fill(0)
    const patients_by_month = new Array(maxIdx + 1).fill(0)

    for (const row of cohortRows) {
      const idx = monthDiff(cohort_month, row.order_month)
      revenue_by_month[idx] = row.assumed_revenue
      patients_by_month[idx] = row.patients
    }

    const total_revenue = revenue_by_month.reduce((s, v) => s + v, 0)
    const ad_spend = spendMap.get(cohort_month) ?? null
    const cac = (ad_spend !== null && new_patients > 0) ? ad_spend / new_patients : null

    summaries.push({
      cohort_month,
      label: formatMonthLabel(cohort_month),
      new_patients,
      ad_spend,
      cac,
      months_active: maxIdx + 1,
      revenue_by_month,
      patients_by_month,
      total_revenue,
      revenue_per_patient: new_patients > 0 ? total_revenue / new_patients : 0,
    })
  }

  return summaries.sort((a, b) => a.cohort_month.localeCompare(b.cohort_month))
}

export function buildRetentionSeries(summaries: CohortSummary[]) {
  return summaries.map(s => ({
    cohort: s.label,
    cohort_month: s.cohort_month,
    data: s.patients_by_month.map((pts, idx) => ({
      month: idx,
      patients: pts,
      pct: s.new_patients > 0 ? Math.round((pts / s.new_patients) * 100) : 0,
    })),
  }))
}
