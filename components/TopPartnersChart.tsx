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
import type { PartnerRow } from '@/types'

interface Props {
  rawPartner: PartnerRow[]
  excludeCurrentMonth: boolean
}

interface PartnerData {
  partner: string
  totalRevenue: number
  newPatients: number
}

function interpolateColor(t: number): string {
  // t = 0 (lowest revenue) → lightest blue, t = 1 (highest revenue) → darkest blue
  // Lightest: #bfdbfe, Darkest: #1d4ed8
  const r0 = 0x1d, g0 = 0x4e, b0 = 0xd8  // darkest (highest revenue)
  const r1 = 0xbf, g1 = 0xdb, b1 = 0xfe  // lightest (lowest revenue)
  const r = Math.round(r0 + (r1 - r0) * (1 - t))
  const g = Math.round(g0 + (g1 - g0) * (1 - t))
  const b = Math.round(b0 + (b1 - b0) * (1 - t))
  return `rgb(${r},${g},${b})`
}

interface TooltipPayloadItem {
  payload: PartnerData
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs shadow-sm">
      <div className="font-medium text-slate-900 mb-1">{d.partner}</div>
      <div className="text-slate-600">${Math.round(d.totalRevenue).toLocaleString()} total revenue</div>
      <div className="text-slate-500">{d.newPatients.toLocaleString()} new patients</div>
    </div>
  )
}

export default function TopPartnersChart({ rawPartner, excludeCurrentMonth }: Props) {
  const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), [])

  const data = useMemo(() => {
    const rows = excludeCurrentMonth
      ? rawPartner.filter(r => r.order_month !== currentMonth)
      : rawPartner

    const revenueMap = new Map<string, number>()
    const patientsMap = new Map<string, number>()

    for (const row of rows) {
      revenueMap.set(row.partner, (revenueMap.get(row.partner) ?? 0) + row.assumed_revenue)
      if (row.order_month === row.cohort_month) {
        patientsMap.set(row.partner, (patientsMap.get(row.partner) ?? 0) + row.patients)
      }
    }

    const partners: PartnerData[] = Array.from(revenueMap.entries()).map(([partner, totalRevenue]) => ({
      partner,
      totalRevenue,
      newPatients: patientsMap.get(partner) ?? 0,
    }))

    return partners
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10)
  }, [rawPartner, excludeCurrentMonth, currentMonth])

  const chartHeight = data.length * 52 + 60

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">Top Partners by Revenue</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Cumulative revenue · top 10 partnership referral sources
        </p>
      </div>

      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: 32, left: 8, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => `$${Math.round(v / 1000)}k`}
          />
          <YAxis
            type="category"
            dataKey="partner"
            width={160}
            tick={{ fontSize: 11, fill: '#475569' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="totalRevenue" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => {
              // t: 1 = highest revenue (darkest), 0 = lowest revenue (lightest)
              const t = data.length > 1 ? 1 - index / (data.length - 1) : 1
              return <Cell key={entry.partner} fill={interpolateColor(t)} />
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
