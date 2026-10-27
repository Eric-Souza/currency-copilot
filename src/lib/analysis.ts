// The numbers behind "should I exchange today?", computed here rather than by the model so
// they're always right. The model only puts them into words (tools/analyze-pair.ts).

import type { RateHistory } from './frankfurter'

/** A 30-day move under this, in percent, counts as flat */
const FLAT_PCT = 0.5

export interface PairAnalysis {
  base: string
  quote: string
  /** The ECB publication date of the latest rate */
  date: string
  latest: number
  avg30: number
  low30: number
  high30: number
  /** Share of the last 30 days' rates below today's, 0 to 100 */
  percentile30: number
  change30Pct: number
  change90Pct: number
  trend: 'rising' | 'falling' | 'flat'
  /** For someone exchanging base into quote: a higher rate gets them more */
  stance: 'favorable' | 'neutral' | 'unfavorable'
}

const pct = (from: number, to: number) => Math.round(((to - from) / from) * 10_000) / 100

export function analyzeHistory({ base, quote, points, changePct }: RateHistory): PairAnalysis {
  const end = points[points.length - 1]
  const cutoff = new Date(new Date(`${end.date}T00:00:00Z`).getTime() - 30 * 86_400_000).toISOString().slice(0, 10)
  const month = points.filter((p) => p.date > cutoff).map((p) => p.rate)
  const latest = end.rate
  const others = month.slice(0, -1)
  const percentile30 = others.length
    ? Math.round((100 * others.filter((rate) => rate < latest).length) / others.length)
    : 50
  const change30Pct = pct(month[0], latest)
  return {
    base,
    quote,
    date: end.date,
    latest,
    avg30: month.reduce((sum, rate) => sum + rate, 0) / month.length,
    low30: Math.min(...month),
    high30: Math.max(...month),
    percentile30,
    change30Pct,
    change90Pct: changePct,
    trend: Math.abs(change30Pct) < FLAT_PCT ? 'flat' : change30Pct > 0 ? 'rising' : 'falling',
    stance: percentile30 >= 70 ? 'favorable' : percentile30 <= 30 ? 'unfavorable' : 'neutral',
  }
}
