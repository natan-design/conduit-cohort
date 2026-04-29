'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import type { CohortSummary } from '@/types'
import { buildRetentionSeries } from '@/lib/transforms'

interface Props {
  cohorts: CohortSummary[]
}

// Color scale from light blue (oldest) to deep navy (newest)
function cohortColor(idx: number, total: number): string {
  const t = total <= 1 ? 1 : idx / (total - 1)
  const r = Math.round(219 - t * 182)   // 219 → 37
  const g = Math.round(234 - t * 171)   // 234 → 99
  const b = Math.round(254 - t * 19)    // 254 → 235
  return `rgb(${r},${g},${b})`
}

// Build combined dataset: each element is { month: N, [cohortLabel]: pct, ... }
function buildChartData(series: ReturnType<typeof buildRetentionSeries>) {
  const maxMonths = Math.max(...series.map(s => s.data.length))
  return Array.from({ length: maxMonths }, (_, m) => {
    const point: Record<string, number | string> = { month: m }
    for (const s of series) {
      const d = s.data[m]
      if (d) point[s.cohort] = d.pct
    }
    return point
  })
}

export default function RetentionChart({ cohorts }: Props) {
  if (!cohorts.length) return (
    <div className="text-center py-20 text-slate-400">No data</div>
  )

  const series = buildRetentionSeries(cohorts)
  const chartData = buildChartData(series)

  // Show only cohorts with enough data for visual clarity
  // But label the legend smartly
  const showLegend = series.length <= 8

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">
          Patient Retention by Cohort
        </h2>
        <p className="text-sm text-slate-400 mt-0.5">
          % of cohort patients still receiving shipments at each month post-acquisition
        </p>
      </div>

      <ResponsiveContainer width="100%" height={480}>
        <LineChart data={chartData} margin={{ top: 8, right: 32, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="month"
            tickFormatter={v => `M+${v}`}
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            label={{ value: 'Months since first shipment', position: 'insideBottom', offset: -4, fontSize: 12, fill: '#94a3b8' }}
          />
          <YAxis
            tickFormatter={v => `${v}%`}
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            domain={[0, 105]}
            width={44}
          />
          <Tooltip
            formatter={(value: number, name: string) => [`${value}%`, name]}
            labelFormatter={label => `Month +${label}`}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
          />
          {/* Asymptote reference line ~40-45% */}
          <ReferenceLine y={40} stroke="#fbbf24" strokeDasharray="4 4" strokeWidth={1.5}
            label={{ value: '~40% floor', position: 'right', fontSize: 11, fill: '#fbbf24' }} />

          {showLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}

          {series.map((s, idx) => (
            <Line
              key={s.cohort}
              dataKey={s.cohort}
              stroke={cohortColor(idx, series.length)}
              strokeWidth={idx === series.length - 1 ? 2.5 : 1.5}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Cohort color legend when too many to show inline */}
      {!showLegend && (
        <div className="mt-4 flex flex-wrap gap-2">
          {series.map((s, idx) => (
            <span key={s.cohort} className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="w-3 h-0.5 rounded-full inline-block"
                style={{ backgroundColor: cohortColor(idx, series.length), height: 2 }} />
              {s.cohort}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
