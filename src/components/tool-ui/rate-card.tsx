import type { Rate } from '@/lib/frankfurter'
import { formatDate, formatRate } from '@/lib/format'

export function RateCard({ base, quote, rate, date }: Rate) {
  return (
    <div className="w-full max-w-sm rounded-xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900">
      <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
        {base} → {quote}
      </div>
      <div className="mt-1 text-3xl font-semibold">
        1 {base} = {formatRate(rate)} {quote}
      </div>
      <div className="mt-1 text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
        1 {quote} = {formatRate(1 / rate)} {base}
      </div>
      <div className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">ECB reference rate · {formatDate(date)}</div>
    </div>
  )
}

export function RateCardSkeleton() {
  return (
    <div className="w-full max-w-sm animate-pulse rounded-xl border border-black/10 p-4 dark:border-white/10">
      <div className="h-4 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-2 h-8 w-56 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-2 h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
    </div>
  )
}
