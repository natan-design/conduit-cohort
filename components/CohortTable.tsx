'use client'

import type { CohortSummary } from '@/types'

type FilterMode = 'all' | 'd2c' | 'partnerships' | 'partner'

interface Props {
  cohorts: CohortSummary[]
  filterMode?: FilterMode
}

const fmt$ = (n: number) =>
  n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${Math.round(n)}`

const fmtFull$ = (n: number) =>
  `$${Math.round(n).toLocaleString()}`

// Max columns to show (we'll show M0 through M_max)
const MAX_MONTHS = 16

export default function CohortTable({ cohorts, filterMode = 'all' }: Props) {
  const isPartnerships = filterMode === 'partnerships' || filterMode === 'partner'
  const spendLabel = isPartnerships ? 'Partnerships Spend' : filterMode === 'd2c' ? 'Ad Spend' : 'Blended Spend'
  const cacLabel = isPartnerships ? 'CAC' : filterMode === 'd2c' ? 'CAC' : 'Blended CAC'
  const getSpend = (c: CohortSummary) => isPartnerships ? c.partnerships_spend : filterMode === 'd2c' ? c.ad_spend : c.blended_spend
  const getCac = (c: CohortSummary) => isPartnerships ? c.partnerships_cac : filterMode === 'd2c' ? c.cac : c.blended_cac
  if (!cohorts.length) return (
    <div className="text-center py-20 text-slate-400">No cohort data available</div>
  )

  // Find global max revenue for heatmap scaling
  const allRevValues = cohorts.flatMap(c => c.revenue_by_month)
  const maxRev = Math.max(...allRevValues, 1)

  const numCols = Math.min(MAX_MONTHS, Math.max(...cohorts.map(c => c.revenue_by_month.length)))

  return (
    <div className="cohort-scroll bg-white rounded-xl border border-slate-200 shadow-sm">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="sticky left-0 bg-white z-10 text-left px-4 py-3 font-semibold text-slate-700 whitespace-nowrap min-w-[110px]">
              Cohort
            </th>
            <th className="px-3 py-3 text-right font-semibold text-slate-700 whitespace-nowrap">
              New Pts
            </th>
            <th className="px-3 py-3 text-right font-semibold text-slate-700 whitespace-nowrap">{spendLabel}</th>
            <th className="px-3 py-3 text-right font-semibold text-slate-700 whitespace-nowrap">{cacLabel}</th>
            {Array.from({ length: numCols }, (_, i) => (
              <th key={i} className="px-3 py-3 text-right font-semibold text-slate-500 whitespace-nowrap text-xs">
                M+{i}
              </th>
            ))}
            <th className="px-3 py-3 text-right font-semibold text-slate-700 whitespace-nowrap">
              Active Mo.
            </th>
            <th className="px-3 py-3 text-right font-semibold text-slate-700 whitespace-nowrap">
              LTV / Pt
            </th>
            <th className="px-3 py-3 text-right font-semibold text-slate-700 whitespace-nowrap">
              Total Rev
            </th>
          </tr>
        </thead>
        <tbody>
          {cohorts.map((c, rowIdx) => {
            const m0Patients = c.patients_by_month[0] ?? 0
            return (
              <tr
                key={c.cohort_month}
                className={`border-b border-slate-100 hover:bg-slate-50/60 transition-colors ${
                  rowIdx % 2 === 0 ? '' : 'bg-slate-50/30'
                }`}
              >
                {/* Cohort label */}
                <td className="sticky left-0 bg-inherit z-10 px-4 py-2.5 font-medium text-slate-800 whitespace-nowrap">
                  {c.label}
                </td>

                {/* New patients */}
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                  {c.new_patients.toLocaleString()}
                </td>

                <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">
                  {getSpend(c) !== null ? fmt$(getSpend(c)!) : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">
                  {getCac(c) !== null ? fmt$(getCac(c)!) : <span className="text-slate-300">—</span>}
                </td>

                {/* Revenue by relative month */}
                {Array.from({ length: numCols }, (_, i) => {
                  const rev = c.revenue_by_month[i] ?? 0
                  const heat = rev > 0 ? Math.min(rev / maxRev, 1) : 0
                  const retentionPct = i > 0 && m0Patients > 0
                    ? Math.round(((c.patients_by_month[i] ?? 0) / m0Patients) * 100)
                    : null
                  const isAcq = i === 0

                  return (
                    <td
                      key={i}
                      className="heatmap-cell px-3 py-2.5 text-right tabular-nums whitespace-nowrap"
                      style={{ '--heat': heat * 0.55 } as React.CSSProperties}
                      title={rev > 0 ? `${fmtFull$(rev)}${retentionPct !== null ? ` · ${retentionPct}% retained` : ''}` : undefined}
                    >
                      {rev > 0 ? (
                        <span className={`${heat > 0.4 ? 'text-white' : 'text-slate-800'} ${isAcq ? 'font-semibold' : ''}`}>
                          {fmt$(rev)}
                          {retentionPct !== null && (
                            <span className={`block text-[10px] leading-none mt-0.5 ${heat > 0.4 ? 'text-blue-100' : 'text-slate-400'}`}>
                              {retentionPct}%
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-200">·</span>
                      )}
                    </td>
                  )
                })}

                {/* Months active */}
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">
                  {c.months_active}
                </td>

                {/* LTV per patient */}
                <td className="px-3 py-2.5 text-right tabular-nums font-medium text-slate-800">
                  {fmt$(c.revenue_per_patient)}
                </td>

                {/* Total revenue */}
                <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-slate-900">
                  {fmt$(c.total_revenue)}
                </td>
              </tr>
            )
          })}
        </tbody>

        {/* Totals footer */}
        <tfoot>
          <tr className="border-t-2 border-slate-300 bg-slate-50">
            <td className="sticky left-0 bg-slate-50 z-10 px-4 py-3 font-bold text-slate-900">
              Total
            </td>
            <td className="px-3 py-3 text-right tabular-nums font-bold text-slate-900">
              {cohorts.reduce((s, c) => s + c.new_patients, 0).toLocaleString()}
            </td>
            <td className="px-3 py-3 text-right tabular-nums font-semibold text-slate-600">
              {(() => {
                const s = cohorts.reduce((t, c) => t + (getSpend(c) ?? 0), 0)
                return s > 0 ? fmt$(s) : <span className="text-slate-300">—</span>
              })()}
            </td>
            <td colSpan={numCols + 2} />
            <td className="px-3 py-3 text-right tabular-nums font-bold text-slate-900">
              {fmt$(cohorts.reduce((s, c) => s + c.total_revenue, 0))}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
