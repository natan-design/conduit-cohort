'use client'

import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { CohortSummary, ChannelRow } from '@/types'
import { buildRetentionSeries, buildCohortSummaries } from '@/lib/transforms'

type ViewMode = 'channel' | 'cohort'

interface Props {
  cohorts: CohortSummary[]
  rawChannel: ChannelRow[]
  excludeCurrentMonth: boolean
}

// Blue gradient: oldest = light, newest = deep navy
function cohortColor(idx: number, total: number): string {
  const t = total <= 1 ? 1 : idx / (total - 1)
  const r = Math.round(219 - t * 182)
  const g = Math.round(234 - t * 171)
  const b = Math.round(254 - t * 19)
  return `rgb(${r},${g},${b})`
}

const CHANNEL_STYLES: Record<string, { color: string; label: string }> = {
  'Direct to Consumer': { color: '#3b82f6', label: 'Dir. Response' },
  'Partnerships':       { color: '#10b981', label: 'Partnerships' },
}

// Weighted-average retention curve per channel:
// at each month M, includes only cohorts that have reached M months,
// so the curve reflects real churn rather than "hasn't had time yet."
function buildChannelAvgData(rawChannel: ChannelRow[], excludeCurrentMonth: boolean) {
  const currentMonth = new Date().toISOString().slice(0, 7)
  const channelKeys = ['Direct to Consumer', 'Partnerships'] as const

  const allSummaries = channelKeys.map(key => {
    let rows: ChannelRow[] = rawChannel.filter(r => r.channel === key)
    if (excludeCurrentMonth) rows = rows.filter(r => r.order_month !== currentMonth)
    const summaries = buildCohortSummaries(rows as any, []).filter(c => c.months_active >= 2)
    return { key, summaries }
  })

  const maxMonths = Math.max(
    ...allSummaries.flatMap(({ summaries }) => summaries.map(s => s.patients_by_month.length)),
    0
  )

  const chartData = Array.from({ length: maxMonths }, (_, m) => {
    const point: Record<string, number | string> = { month: m }
    for (const { key, summaries } of allSummaries) {
      const label = CHANNEL_STYLES[key].label
      const eligible = summaries.filter(s => m < s.patients_by_month.length)
      const totalStart = eligible.reduce((s, c) => s + c.new_patients, 0)
      const totalAt = eligible.reduce((s, c) => s + (c.patients_by_month[m] ?? 0), 0)
      if (totalStart > 0) point[label] = Math.round((totalAt / totalStart) * 100)
    }
    return point
  })

  return chartData
}

export default function RetentionChart({ cohorts, rawChannel, excludeCurrentMonth }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('channel')
  const [activeCohort, setActiveCohort] = useState<string | null>(null)

  const cohortSeries = useMemo(() => buildRetentionSeries(cohorts), [cohorts])

  const cohortChartData = useMemo(() => {
    const maxMonths = Math.max(...cohortSeries.map(s => s.data.length), 0)
    return Array.from({ length: maxMonths }, (_, m) => {
      const point: Record<string, number | string> = { month: m }
      for (const s of cohortSeries) {
        const d = s.data[m]
        if (d) point[s.cohort] = d.pct
      }
      return point
    })
  }, [cohortSeries])

  const channelChartData = useMemo(
    () => buildChannelAvgData(rawChannel, excludeCurrentMonth),
    [rawChannel, excludeCurrentMonth]
  )

  if (!cohorts.length) return (
    <div className="text-center py-20 text-slate-400">No data</div>
  )

  const sharedAxisProps = {
    cartesianGrid: <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />,
    xAxis: (
      <XAxis
        dataKey="month"
        tickFormatter={(v: number) => `M+${v}`}
        tick={{ fontSize: 12, fill: '#94a3b8' }}
        label={{ value: 'Months since first shipment', position: 'insideBottom', offset: -12, fontSize: 12, fill: '#94a3b8' }}
      />
    ),
    yAxis: (
      <YAxis
        tickFormatter={(v: number) => `${v}%`}
        tick={{ fontSize: 12, fill: '#94a3b8' }}
        domain={[0, 105]}
        width={44}
      />
    ),
    tooltip: (
      <Tooltip
        formatter={(value: number, name: string) => [`${value}%`, name]}
        labelFormatter={(label: number) => `Month +${label}`}
        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
      />
    ),
    refLine: (
      <ReferenceLine
        y={40} stroke="#f59e0b" strokeDasharray="5 4" strokeWidth={1.5}
        label={{ value: '~40% floor', position: 'insideRight', offset: 8, fontSize: 11, fill: '#b45309' }}
      />
    ),
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            {viewMode === 'channel' ? 'Revenue Retention by Channel' : 'Patient Retention by Cohort'}
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {viewMode === 'channel'
              ? 'Patient-weighted average — % still active at each month post-acquisition'
              : '% of cohort patients still receiving shipments · click a cohort to isolate'}
          </p>
        </div>
        <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5 shrink-0">
          <button
            onClick={() => setViewMode('channel')}
            className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
              viewMode === 'channel'
                ? 'bg-white shadow-sm text-slate-900'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            By Channel
          </button>
          <button
            onClick={() => setViewMode('cohort')}
            className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
              viewMode === 'cohort'
                ? 'bg-white shadow-sm text-slate-900'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            By Cohort
          </button>
        </div>
      </div>

      {/* ── Channel view ── */}
      {viewMode === 'channel' && (
        <>
          <ResponsiveContainer width="100%" height={420}>
            <LineChart data={channelChartData} margin={{ top: 8, right: 80, left: 0, bottom: 28 }}>
              {sharedAxisProps.cartesianGrid}
              {sharedAxisProps.xAxis}
              {sharedAxisProps.yAxis}
              {sharedAxisProps.tooltip}
              {sharedAxisProps.refLine}
              {Object.entries(CHANNEL_STYLES).map(([, { color, label }]) => (
                <Line
                  key={label}
                  dataKey={label}
                  stroke={color}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: color, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-4 flex gap-8 justify-center">
            {Object.entries(CHANNEL_STYLES).map(([, { color, label }]) => (
              <span key={label} className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <span className="inline-block rounded-full" style={{ width: 24, height: 3, backgroundColor: color }} />
                {label}
              </span>
            ))}
          </div>
        </>
      )}

      {/* ── Cohort view ── */}
      {viewMode === 'cohort' && (
        <>
          <ResponsiveContainer width="100%" height={420}>
            <LineChart data={cohortChartData} margin={{ top: 8, right: 32, left: 0, bottom: 28 }}>
              {sharedAxisProps.cartesianGrid}
              {sharedAxisProps.xAxis}
              {sharedAxisProps.yAxis}
              {sharedAxisProps.tooltip}
              {sharedAxisProps.refLine}
              {cohortSeries.map((s, idx) => {
                const isActive = activeCohort === s.cohort
                const isDimmed = activeCohort !== null && !isActive
                return (
                  <Line
                    key={s.cohort}
                    dataKey={s.cohort}
                    stroke={cohortColor(idx, cohortSeries.length)}
                    strokeWidth={isActive ? 3.5 : 1.5}
                    strokeOpacity={isDimmed ? 0.12 : 1}
                    dot={false}
                    activeDot={isDimmed ? false : { r: 4, strokeWidth: 0 }}
                    connectNulls
                    style={{ cursor: 'pointer' }}
                    onClick={() => setActiveCohort(isActive ? null : s.cohort)}
                  />
                )
              })}
            </LineChart>
          </ResponsiveContainer>

          {/* Clickable cohort pill legend */}
          <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1.5 justify-center">
            {cohortSeries.map((s, idx) => {
              const isActive = activeCohort === s.cohort
              const isDimmed = activeCohort !== null && !isActive
              return (
                <button
                  key={s.cohort}
                  onClick={() => setActiveCohort(isActive ? null : s.cohort)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-all border ${
                    isActive
                      ? 'bg-slate-900 text-white border-slate-900'
                      : isDimmed
                      ? 'opacity-25 border-transparent text-slate-500'
                      : 'border-slate-200 text-slate-600 hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className="inline-block rounded-full shrink-0"
                    style={{ width: 8, height: 8, backgroundColor: cohortColor(idx, cohortSeries.length) }}
                  />
                  {s.cohort}
                </button>
              )
            })}
            {activeCohort && (
              <button
                onClick={() => setActiveCohort(null)}
                className="px-2 py-1 rounded-full text-xs text-blue-600 border border-blue-200 hover:bg-blue-50 transition-all"
              >
                Show all
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
