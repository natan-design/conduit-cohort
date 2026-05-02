'use client'

import { useState, useMemo } from 'react'
import type { DashboardData, CohortRow, ChannelRow, PartnerRow } from '@/types'
import { buildCohortSummaries, formatMonthLabel } from '@/lib/transforms'
import CohortTable from './CohortTable'
import RetentionChart from './RetentionChart'

type FilterMode = 'all' | 'd2c' | 'partnerships' | 'partner'
type Tab = 'cohort' | 'retention'

const D2C_ORGS = new Set(['D2c Conduit', 'CH Direct'])

export default function CohortDashboard({
  cohorts, rawAll, rawChannel, rawPartner, partners, lastRefreshed,
}: DashboardData) {
  const [tab, setTab] = useState<Tab>('cohort')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [selectedPartner, setSelectedPartner] = useState<string>('')
  const [excludeCurrentMonth, setExcludeCurrentMonth] = useState(true)

  const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), [])

  // Derive cohort summaries for the current filter
  const filteredCohorts = useMemo(() => {
    let rows: CohortRow[]

    if (filterMode === 'all') {
      rows = rawAll
    } else if (filterMode === 'd2c') {
      rows = rawChannel.filter((r): r is ChannelRow => (r as ChannelRow).channel === 'Direct to Consumer')
    } else if (filterMode === 'partnerships') {
      rows = rawChannel.filter((r): r is ChannelRow => (r as ChannelRow).channel === 'Partnerships')
    } else {
      rows = rawPartner.filter((r): r is PartnerRow => (r as PartnerRow).partner === selectedPartner)
    }

    if (excludeCurrentMonth) {
      rows = rows.filter(r => r.order_month !== currentMonth)
    }

    return buildCohortSummaries(rows, []).filter(c => c.months_active >= 2)
  }, [filterMode, selectedPartner, excludeCurrentMonth, currentMonth, rawAll, rawChannel, rawPartner])

  const totalRevenue = filteredCohorts.reduce((s, c) => s + c.total_revenue, 0)
  const totalPatients = filteredCohorts.reduce((s, c) => s + c.new_patients, 0)
  const avgLTV = totalPatients > 0 ? totalRevenue / totalPatients : 0

  const refreshedAt = new Date(lastRefreshed).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              Conduit Health <span className="text-slate-400 font-normal">·</span>{' '}
              NewU DME Cohort Analysis
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Live from Snowflake · Last refreshed {refreshedAt}
            </p>
          </div>

          {/* Summary stats */}
          <div className="flex gap-8">
            <Stat label="Total Patients" value={totalPatients.toLocaleString()} />
            <Stat label="Total Revenue" value={`$${(totalRevenue / 1_000_000).toFixed(2)}M`} />
            <Stat label="Avg LTV" value={`$${Math.round(avgLTV).toLocaleString()}`} />
          </div>
        </div>
      </header>

      {/* Controls */}
      <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center gap-4 flex-wrap">
        {/* Tabs */}
        <div className="flex bg-white border border-slate-200 rounded-lg p-0.5 gap-0.5">
          <TabBtn active={tab === 'cohort'} onClick={() => setTab('cohort')}>
            Cohort Table
          </TabBtn>
          <TabBtn active={tab === 'retention'} onClick={() => setTab('retention')}>
            Retention Curves
          </TabBtn>
        </div>

        <div className="h-6 w-px bg-slate-200" />

        {/* Channel filter */}
        <div className="flex bg-white border border-slate-200 rounded-lg p-0.5 gap-0.5">
          <FilterBtn active={filterMode === 'all'} onClick={() => setFilterMode('all')}>
            All Patients
          </FilterBtn>
          <FilterBtn active={filterMode === 'd2c'} onClick={() => setFilterMode('d2c')}>
            D2C
          </FilterBtn>
          <FilterBtn active={filterMode === 'partnerships' || filterMode === 'partner'}
            onClick={() => setFilterMode('partnerships')}>
            Partnerships
          </FilterBtn>
        </div>

        <div className="h-6 w-px bg-slate-200" />

        {/* Current month toggle */}
        <button
          onClick={() => setExcludeCurrentMonth(!excludeCurrentMonth)}
          className={`px-3 py-1.5 text-sm rounded-lg font-medium border transition-all ${
            excludeCurrentMonth
              ? 'bg-amber-50 border-amber-300 text-amber-700'
              : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
          }`}
        >
          {excludeCurrentMonth ? '⊘ Excl. current mo.' : '+ Incl. current mo.'}
        </button>

        {/* Partner dropdown — only show when in partnerships mode */}
        {(filterMode === 'partnerships' || filterMode === 'partner') && (
          <select
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedPartner}
            onChange={e => {
              setSelectedPartner(e.target.value)
              setFilterMode(e.target.value ? 'partner' : 'partnerships')
            }}
          >
            <option value="">All Partners</option>
            {partners.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        )}
      </div>

      {/* Content */}
      <div className="max-w-screen-2xl mx-auto px-6 pb-12">
        {tab === 'cohort' ? (
          <CohortTable cohorts={filteredCohorts} filterMode={filterMode} />
        ) : (
          <RetentionChart cohorts={filteredCohorts} />
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <div className="text-lg font-semibold text-slate-900">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  )
}

function TabBtn({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-sm rounded-md font-medium transition-all ${
        active
          ? 'bg-blue-600 text-white shadow-sm'
          : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      {children}
    </button>
  )
}

function FilterBtn({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-sm rounded-md font-medium transition-all ${
        active
          ? 'bg-slate-900 text-white shadow-sm'
          : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      {children}
    </button>
  )
}
