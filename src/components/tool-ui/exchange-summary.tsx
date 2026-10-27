import type { PairAnalysis } from '@/lib/analysis'
import { formatChange, formatDate, formatRate } from '@/lib/format'

type Props = PairAnalysis & { summary: { headline: string; reasons: string[] } | null }

// Status colors carry an icon and a label too, so the stance never relies on color alone
const STANCES = {
  favorable: { icon: '▲', label: 'Better than most of the month', className: 'text-emerald-700 dark:text-emerald-400' },
  neutral: { icon: '●', label: 'About average for the month', className: 'text-zinc-600 dark:text-zinc-300' },
  unfavorable: { icon: '▼', label: 'Worse than most of the month', className: 'text-amber-700 dark:text-amber-400' },
}

function RangeBar({ low, high, avg, latest }: { low: number; high: number; avg: number; latest: number }) {
  const at = (value: number) => (high === low ? 50 : ((value - low) / (high - low)) * 100)
  return (
    <div className="mt-4">
      <div className="relative h-2 rounded-full bg-[var(--chart-grid)]">
        {/* The 30-day average, as a recessive tick */}
        <div className="absolute top-[-3px] h-3.5 w-px bg-[var(--chart-text)]" style={{ left: `${at(avg)}%` }} />
        <div
          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--chart-surface)] bg-[var(--series-1)]"
          style={{ left: `${at(latest)}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span>30-day low {formatRate(low)}</span>
        <span>avg {formatRate(avg)}</span>
        <span>high {formatRate(high)}</span>
      </div>
    </div>
  )
}

export function ExchangeSummary(props: Props) {
  const { base, quote, date, latest, avg30, low30, high30, percentile30, change30Pct, change90Pct, stance, summary } = props
  const s = STANCES[stance]
  return (
    <div className="w-full max-w-md rounded-xl border border-black/10 bg-[var(--chart-surface)] p-4 shadow-sm dark:border-white/10">
      <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
        {base} → {quote} · Exchange today?
      </div>
      <div className={`mt-1 flex items-center gap-1.5 text-sm font-semibold ${s.className}`}>
        <span aria-hidden>{s.icon}</span>
        {s.label}
      </div>
      {summary && <p className="mt-2 text-lg font-semibold leading-snug">{summary.headline}</p>}
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-semibold">{formatRate(latest)}</span>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">beats {percentile30}% of the last 30 days</span>
      </div>

      <div role="img" aria-label={`Today's ${formatRate(latest)} within the 30-day range ${formatRate(low30)} to ${formatRate(high30)}`}>
        <RangeBar low={low30} high={high30} avg={avg30} latest={latest} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-xs text-zinc-500 dark:text-zinc-400">30 days</dt>
          <dd className="font-medium">{formatChange(change30Pct)}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500 dark:text-zinc-400">90 days</dt>
          <dd className="font-medium">{formatChange(change90Pct)}</dd>
        </div>
      </dl>

      {summary && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
          {summary.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}

      <div className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
        Based on past ECB reference rates to {formatDate(date)}, not a forecast or financial advice. Your bank&rsquo;s rate will differ.
      </div>
    </div>
  )
}

export function ExchangeSummarySkeleton() {
  return (
    <div className="w-full max-w-md animate-pulse rounded-xl border border-black/10 p-4 dark:border-white/10">
      <div className="h-4 w-40 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-2 h-6 w-64 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-3 h-8 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-4 h-2 rounded bg-zinc-100 dark:bg-zinc-800/60" />
    </div>
  )
}
