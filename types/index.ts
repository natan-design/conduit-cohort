export interface CohortRow {
  order_month: string   // "2025-01"
  cohort_month: string  // "2025-01"
  patients: number
  assumed_revenue: number
}

export interface ChannelRow extends CohortRow {
  channel: 'Direct to Consumer' | 'Partnerships'
}

export interface PartnerRow extends CohortRow {
  partner: string
}

export interface AdSpendRow {
  month: string   // "2025-01"
  total_spend: number
}

export interface CohortSummary {
  cohort_month: string
  label: string           // "Jan 2025"
  new_patients: number
  ad_spend: number | null
  cac: number | null
  months_active: number
  revenue_by_month: number[]   // index = relative month (0 = acquisition)
  patients_by_month: number[]
  total_revenue: number
  revenue_per_patient: number
}

export interface DashboardData {
  cohorts: CohortSummary[]
  rawAll: CohortRow[]
  rawChannel: ChannelRow[]
  rawPartner: PartnerRow[]
  partners: string[]
  lastRefreshed: string
}
