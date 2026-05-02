'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { useMemo } from 'react'
import type { CohortSummary } from '@/types'

interface Props {
  cohorts: CohortSummary[]
}

function addMonths(ym: string, n: number): string {
  const [year, month] = ym.split('-').map(Number)
  const date = new Date(year, month - 1 + n, 1)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
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

export default function RevenueMomentumChart({ cohorts }: Props) {
  const chartData = useMemo(() => {
    const newBucket = new Map<string, number>()
    const retainedBucket = new Map<string, number>()

    for (const cohort of cohorts) {
      for (let m = 0; m < cohort.revenue_by_month.length; m++) {
        const calendarMonth = addMonths(cohort.cohort_month, m)
        const rev = cohort.revenue_by_month[m]

        if (m === 0) {
          newBucket.set(calendarMonth, (newBucket.get(calendarMonth) ?? 0) + rev)
        } else {
          retainedBucket.set(calendarMonth, (retainedBucket.get(calendarMonth) ?? 0) + rev)
        }
      }
    }

    const allMonths = new Set([...newBucket.keys(), ...retainedBucket.keys()])
    return Array.from(allMonths)
      .sort()
      .map(month => ({
        month: formatLabel(month),
        'Retained Patients': retainedBucket.get(month) ?? 0,
        'New Patients': newBucket.get(month) ?? 0,
      }))
  }, [cohorts])

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">Revenue Momentum</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Monthly revenue — new patient acquisition vs retained recurring base
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
            tickFormatter={v => `$${Math.round(v / 1000)}k`}
            width={52}
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              `$${Math.round(value).toLocaleString()}`,
              name,
            ]}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
          />
          <Bar dataKey="Retained Patients" stackId="rev" fill="#bfdbfe" radius={[0, 0, 0, 0]} />
          <Bar dataKey="New Patients" stackId="rev" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div className="flex gap-6 mt-4 px-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: '#3b82f6' }} />
          <span className="text-slate-600">New Patients</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: '#bfdbfe' }} />
          <span className="text-slate-600">Retained Patients</span>
        </div>
      </div>
    </div>
  )
}
