'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useMemo } from 'react'
import type { ChannelRow } from '@/types'
import { buildCohortSummaries } from '@/lib/transforms'

interface Props {
  rawChannel: ChannelRow[]
  excludeCurrentMonth: boolean
}

const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
}

function formatLabel(ym: string): string {
  const [year, month] = ym.split('-')
  return `${MONTH_LABELS[month]} ${year.slice(2)}`
}

export default function NewPatientGrowthChart({ rawChannel, excludeCurrentMonth }: Props) {
  const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), [])

  const chartData = useMemo(() => {
    const filterMonth = (rows: ChannelRow[]) =>
      excludeCurrentMonth ? rows.filter(r => r.order_month !== currentMonth) : rows

    const d2cSummaries = buildCohortSummaries(
      filterMonth(rawChannel.filter(r => r.channel === 'Direct to Consumer')) as any,
      []
    )
    const partSummaries = buildCohortSummaries(
      filterMonth(rawChannel.filter(r => r.channel === 'Partnerships')) as any,
      []
    )

    const map = new Map<string, { D2C: number; Partnerships: number }>()

    for (const s of d2cSummaries) {
      const entry = map.get(s.cohort_month) ?? { D2C: 0, Partnerships: 0 }
      entry.D2C = s.new_patients
      map.set(s.cohort_month, entry)
    }
    for (const s of partSummaries) {
      const entry = map.get(s.cohort_month) ?? { D2C: 0, Partnerships: 0 }
      entry.Partnerships = s.new_patients
      map.set(s.cohort_month, entry)
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, vals]) => ({
        month: formatLabel(month),
        Partnerships: vals.Partnerships,
        D2C: vals.D2C,
      }))
  }, [rawChannel, excludeCurrentMonth, currentMonth])

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">New Patient Acquisition</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Monthly new patients by acquisition channel
        </p>
      </div>

      <ResponsiveContainer width="100%" height={340}>
        <BarChart data={chartData} margin={{ top: 8, right: 24, left: 16, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
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
            width={40}
          />
          <Tooltip
            formatter={(value: number, name: string) => [value.toLocaleString(), name]}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
          />
          <Bar dataKey="Partnerships" stackId="pts" fill="#10b981" radius={[0, 0, 0, 0]} />
          <Bar dataKey="D2C" stackId="pts" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div className="flex gap-6 mt-4 px-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: '#3b82f6' }} />
          <span className="text-slate-600">D2C</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: '#10b981' }} />
          <span className="text-slate-600">Partnerships</span>
        </div>
      </div>
    </div>
  )
}
