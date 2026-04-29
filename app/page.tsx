import { query } from '@/lib/snowflake'
import { buildCohortSummaries } from '@/lib/transforms'
import { ALL_PATIENTS_SQL, BY_CHANNEL_SQL, BY_PARTNER_SQL, AD_SPEND_SQL } from '@/lib/queries'
import type { CohortRow, ChannelRow, PartnerRow, AdSpendRow } from '@/types'
import CohortDashboard from '@/components/CohortDashboard'

export const dynamic = 'force-dynamic' // Always fetch live data from Snowflake

export default async function Home() {
  const [rawAll, rawChannel, rawPartner, adSpend] = await Promise.all([
    query<CohortRow>(ALL_PATIENTS_SQL),
    query<ChannelRow>(BY_CHANNEL_SQL),
    query<PartnerRow>(BY_PARTNER_SQL),
    query<AdSpendRow>(AD_SPEND_SQL),
  ])

  const cohorts = buildCohortSummaries(rawAll, adSpend)
  const partners = [...new Set(rawPartner.map(r => r.partner))].sort()

  return (
    <CohortDashboard
      cohorts={cohorts}
      rawAll={rawAll}
      rawChannel={rawChannel}
      rawPartner={rawPartner}
      partners={partners}
      lastRefreshed={new Date().toISOString()}
    />
  )
}
