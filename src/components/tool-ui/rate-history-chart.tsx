'use client'

import { CartesianGrid, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { RateHistory } from '@/lib/frankfurter'
import { formatChange, formatDate, formatRate } from '@/lib/format'

const AXIS_TICK = { fill: 'var(--chart-text)', fontSize: 12 }

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: { date: string; rate: number } }[] }) {
  if (!active || !payload?.length) return null
  const { date, rate } = payload[0].payload
  return (
    <div className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm shadow-sm dark:border-white/10 dark:bg-zinc-900">
      <div className="flex items-center gap-2">
        <span className="h-0.5 w-3 rounded-full bg-[var(--series-1)]" aria-hidden />
        <span className="font-semibold tabular-nums">{formatRate(rate)}</span>
      </div>
      <div className="text-xs text-zinc-500 dark:text-zinc-400">{formatDate(date)}</div>
    </div>
  )
}

export function RateHistoryChart({ base, quote, points, last, min, max, changePct }: RateHistory) {
  const end = points[points.length - 1]
  const from = points[0].date
  return (
    <div className="w-full rounded-xl border border-black/10 bg-[var(--chart-surface)] p-4 shadow-sm dark:border-white/10">
      <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
        {base} → {quote} · {formatDate(from)} – {formatDate(end.date)}
      </div>
      <div className="mt-1 flex items-baseline gap-3">
        <span className="text-3xl font-semibold">{formatRate(last)}</span>
        <span className="text-sm font-medium">{formatChange(changePct)}</span>
      </div>
      <div className="text-xs text-zinc-500 dark:text-zinc-400">
        Low {formatRate(min)} · High {formatRate(max)}
      </div>

      <div className="mt-4 h-52" role="img" aria-label={`${base} to ${quote} from ${from} to ${end.date}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 64, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="date"
              tickFormatter={(d: string) => formatDate(d, { year: false })}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: 'var(--chart-grid)' }}
              minTickGap={40}
            />
            <YAxis
              domain={['auto', 'auto']}
              tickFormatter={formatRate}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={56}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--chart-text)', strokeWidth: 1 }} />
            <Line
              dataKey="rate"
              type="linear"
              stroke="var(--series-1)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              dot={false}
              activeDot={{ r: 4, fill: 'var(--series-1)', stroke: 'var(--chart-surface)', strokeWidth: 2 }}
              isAnimationActive={false}
            />
            {/* The latest value, labeled at the end of the line */}
            <ReferenceDot
              x={end.date}
              y={end.rate}
              r={4}
              fill="var(--series-1)"
              stroke="var(--chart-surface)"
              strokeWidth={2}
              label={{ value: formatRate(end.rate), position: 'right', fill: 'var(--foreground)', fontSize: 12 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-zinc-500 dark:text-zinc-400">Show table</summary>
        <div className="mt-2 max-h-56 overflow-y-auto">
          <table className="w-full text-left tabular-nums">
            <thead className="text-xs text-zinc-500 dark:text-zinc-400">
              <tr>
                <th className="py-1 font-medium">Date</th>
                <th className="py-1 text-right font-medium">
                  1 {base} in {quote}
                </th>
              </tr>
            </thead>
            <tbody>
              {[...points].reverse().map((p) => (
                <tr key={p.date} className="border-t border-black/5 dark:border-white/5">
                  <td className="py-1">{formatDate(p.date)}</td>
                  <td className="py-1 text-right">{formatRate(p.rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}

export function RateHistorySkeleton() {
  return (
    <div className="w-full animate-pulse rounded-xl border border-black/10 p-4 dark:border-white/10">
      <div className="h-4 w-48 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-2 h-8 w-40 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-4 h-52 rounded bg-zinc-100 dark:bg-zinc-800/60" />
    </div>
  )
}
