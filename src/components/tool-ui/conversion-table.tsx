import type { Conversion } from '@/lib/frankfurter'
import { formatAmount, formatDate, formatRate } from '@/lib/format'

export function ConversionTable({ amount, base, date, rows, unavailable }: Conversion) {
  return (
    <div className="w-full max-w-md rounded-xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900">
      <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Converting</div>
      <div className="mt-1 text-3xl font-semibold">
        {formatAmount(amount, base)} {base}
      </div>
      {rows.length > 0 && (
        <table className="mt-3 w-full text-left tabular-nums">
          <thead className="text-xs text-zinc-500 dark:text-zinc-400">
            <tr>
              <th className="py-1 font-medium">Currency</th>
              <th className="py-1 text-right font-medium">Amount</th>
              <th className="py-1 text-right font-medium">Rate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.quote} className="border-t border-black/5 dark:border-white/5">
                <td className="py-1.5 font-medium">{row.quote}</td>
                <td className="py-1.5 text-right text-lg font-semibold">{formatAmount(row.value, row.quote)}</td>
                <td className="py-1.5 text-right text-sm text-zinc-500 dark:text-zinc-400">{formatRate(row.rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {unavailable.length > 0 && (
        <div className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Not covered by the ECB: {unavailable.join(', ')}
        </div>
      )}
      <div className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
        Rate is 1 {base} in each currency · ECB reference rates · {formatDate(date)}
      </div>
    </div>
  )
}

export function ConversionTableSkeleton() {
  return (
    <div className="w-full max-w-md animate-pulse rounded-xl border border-black/10 p-4 dark:border-white/10">
      <div className="h-4 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-2 h-8 w-40 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-4 h-24 rounded bg-zinc-100 dark:bg-zinc-800/60" />
    </div>
  )
}
