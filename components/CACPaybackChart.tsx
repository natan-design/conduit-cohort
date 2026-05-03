'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { useMemo } from 'react'
import type { ChannelRow } from '@/types'
import { STATIC_AD_SPEND, PARTNERSHIPS_SPEND } from '@/lib/marketing-spend'
import { buildCohortSummaries } from '@/lib/transforms'

interface Props {
  rawChannel: ChannelRow[]
  excludeCurrentMonth: boolean
}

const D2C_COLOR = '#3b82f6'
const PARTNERSHIPS_COLOR = '#10b981'

function fmt(n: number) {
  return `$${Math.round(n).toLocaleString()}`
}

export default function CACPaybackChart({ rawChannel, excludeCurrentMonth }: Props) {
  const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), [])

  const { d2cCAC, partnershipsCAC, chartData, maxMonths } = useMemo(() => {
    // Filter by channel
    const d2cRows = rawChannel.filter(r => r.channel === 'Direct to Consumer')
    const partRows = rawChannel.filter(r => r.channel === 'Partnerships')

    // Optionally exclude current month
    const filterMonth = (rows: ChannelRow[]) =>
      excludeCurrentMonth ? rows.filter(r => r.order_month !== currentMonth) : rows

    const d2cSummaries = buildCohortSummaries(filterMonth(d2cRows) as any, []).filter(
      c => c.months_active >= 2
    )
    const partSummaries = buildCohortSummaries(filterMonth(partRows) as any, []).filter(
      c => c.months_active >= 2
    )

    // Compute avg CAC per channel
    // D2C: sum STATIC_AD_SPEND for cohorts that have spend data, div by sum of new_patients
    const d2cWithSpend = d2cSummaries.filter(c => STATIC_AD_SPEND[c.cohort_month] != null)
    const d2cSpendTotal = d2cWithSpend.reduce((s, c) => s + STATIC_AD_SPEND[c.cohort_month], 0)
    const d2cPatients = d2cWithSpend.reduce((s, c) => s + c.new_patients, 0)
    const d2cCAC = d2cPatients > 0 ? d2cSpendTotal / d2cPatients : 0

    const partWithSpend = partSummaries.filter(c => PARTNERSHIPS_SPEND[c.cohort_month] != null)
    const partSpendTotal = partWithSpend.reduce((s, c) => s + PARTNERSHIPS_SPEND[c.cohort_month], 0)
    const partPatients = partWithSpend.reduce((s, c) => s + c.new_patients, 0)
    const partnershipsCAC = partPatients > 0 ? partSpendTotal / partPatients : 0

    // Compute cumulative avg revenue per patient at each relative month M
    // For month M, use only cohorts that have at least M+1 months of data
    const maxD2C = d2cSummaries.length > 0
      ? Math.max(...d2cSummaries.map(c => c.revenue_by_month.length))
      : 0
    const maxPart = partSummaries.length > 0
      ? Math.max(...partSummaries.map(c => c.revenue_by_month.length))
      : 0
    const maxMonths = Math.max(maxD2C, maxPart)

    const chartData: { month: string; 'Dir. Response'?: number; Partnerships?: number }[] = []

    for (let m = 0; m < maxMonths; m++) {
      const d2cEligible = d2cSummaries.filter(c => c.revenue_by_month.length >= m + 1)
      const partEligible = partSummaries.filter(c => c.revenue_by_month.length >= m + 1)

      const d2cRevTotal = d2cEligible.reduce(
        (s, c) => s + c.revenue_by_month.slice(0, m + 1).reduce((a, b) => a + b, 0),
        0
      )
      const d2cPat = d2cEligible.reduce((s, c) => s + c.new_patients, 0)

      const partRevTotal = partEligible.reduce(
        (s, c) => s + c.revenue_by_month.slice(0, m + 1).reduce((a, b) => a + b, 0),
        0
      )
      const partPat = partEligible.reduce((s, c) => s + c.new_patients, 0)

      const point: { month: string; 'Dir. Response'?: number; Partnerships?: number } = {
        month: `M+${m}`,
      }
      if (d2cEligible.length > 0 && d2cPat > 0) point['Dir. Response'] = d2cRevTotal / d2cPat
      if (partEligible.length > 0 && partPat > 0) point.Partnerships = partRevTotal / partPat

      chartData.push(point)
    }

    return { d2cCAC, partnershipsCAC, chartData, maxMonths }
  }, [rawChannel, excludeCurrentMonth, currentMonth])

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">CAC Payback Period</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Cumulative revenue per patient vs. average customer acquisition cost by channel
        </p>
      </div>

      <ResponsiveContainer width="100%" height={340}>
        <LineChart data={chartData} margin={{ top: 8, right: 24, left: 16, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => `$${Math.round(v).toLocaleString()}`}
            width={72}
          />
          <Tooltip
            formatter={(value: number, name: string) => [`$${Math.round(value).toLocaleString()}`, name]}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
          />
          {d2cCAC > 0 && (
            <ReferenceLine
              y={d2cCAC}
              stroke={D2C_COLOR}
              strokeDasharray="4 3"
              strokeWidth={1.5}
            />
          )}
          {partnershipsCAC > 0 && (
            <ReferenceLine
              y={partnershipsCAC}
              stroke={PARTNERSHIPS_COLOR}
              strokeDasharray="4 3"
              strokeWidth={1.5}
            />
          )}
          <Line
            type="monotone"
            dataKey="Dir. Response"
            stroke={D2C_COLOR}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="Partnerships"
            stroke={PARTNERSHIPS_COLOR}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex gap-6 mt-4 px-2">
        {d2cCAC > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <span className="inline-block w-4 h-0.5 rounded" style={{ backgroundColor: D2C_COLOR }} />
            <span className="text-slate-700">Dir. Response</span>
            <span className="text-slate-400">avg CAC {fmt(d2cCAC)}</span>
          </div>
        )}
        {partnershipsCAC > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <span className="inline-block w-4 h-0.5 rounded" style={{ backgroundColor: PARTNERSHIPS_COLOR }} />
            <span className="text-slate-700">Partnerships</span>
            <span className="text-slate-400">avg CAC {fmt(partnershipsCAC)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
