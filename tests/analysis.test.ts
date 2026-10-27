import { MockLanguageModelV3 } from 'ai/test'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { analyzeHistory } from '@/lib/analysis'
import type { RateHistory } from '@/lib/frankfurter'

const model = vi.hoisted(() => ({ current: undefined as unknown }))
vi.mock('@/lib/model', () => ({ getModel: () => model.current }))

const { analyzePair } = await import('@/lib/tools/analyze-pair')

function history(rates: [string, number][]): RateHistory {
  const values = rates.map(([, rate]) => rate)
  return {
    base: 'USD',
    quote: 'BRL',
    points: rates.map(([date, rate]) => ({ date, rate })),
    first: values[0],
    last: values[values.length - 1],
    min: Math.min(...values),
    max: Math.max(...values),
    changePct: 4,
  }
}

// An old point outside the 30-day window, then a month where today's 5.5 is the best rate
const RISING = history([
  ['2026-08-01', 6],
  ['2026-09-30', 5],
  ['2026-10-10', 5.1],
  ['2026-10-20', 5.2],
  ['2026-10-26', 5.5],
])

describe('analyzeHistory', () => {
  it("ranks today's rate against the last 30 days only", () => {
    expect(analyzeHistory(RISING)).toMatchObject({
      date: '2026-10-26',
      latest: 5.5,
      low30: 5,
      high30: 5.5,
      percentile30: 100,
      change30Pct: 10,
      change90Pct: 4,
      trend: 'rising',
      stance: 'favorable',
    })
    expect(analyzeHistory(RISING).avg30).toBeCloseTo(5.2)
  })

  it('calls a small move flat, and a low rate unfavorable', () => {
    const low = analyzeHistory(history([['2026-10-01', 5.02], ['2026-10-10', 5.03], ['2026-10-26', 5]]))
    expect(low).toMatchObject({ percentile30: 0, trend: 'flat', stance: 'unfavorable' })
  })
})

const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 5, text: 5, reasoning: undefined },
}

describe('analyzePair', () => {
  afterEach(() => vi.unstubAllGlobals())
  const series = { rates: Object.fromEntries(RISING.points.map((p) => [p.date, { BRL: p.rate }])) }
  const run = () => analyzePair.execute!({ base: 'USD', quote: 'BRL' }, { toolCallId: 't1', messages: [] })

  it('adds the model-written summary to the computed numbers', async () => {
    vi.stubGlobal('fetch', async () => Response.json(series))
    const summary = { headline: 'Yes, today beats every rate this month.', reasons: ['It is the 30-day high.', 'Up 10% in 30 days.'] }
    const mock = new MockLanguageModelV3({
      doGenerate: async () => ({
        content: [{ type: 'text', text: JSON.stringify(summary) }],
        finishReason: { unified: 'stop', raw: undefined },
        usage,
        warnings: [],
      }),
    })
    model.current = mock
    expect(await run()).toMatchObject({ percentile30: 100, stance: 'favorable', summary })
    // The model was given the numbers, not asked to work them out
    expect(JSON.stringify(mock.doGenerateCalls[0].prompt)).toContain('\\"percentile30\\":100')
  })

  it('still returns the numbers when the summary fails', async () => {
    vi.stubGlobal('fetch', async () => Response.json(series))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    model.current = new MockLanguageModelV3({
      doGenerate: async () => {
        throw new Error('overloaded')
      },
    })
    expect(await run()).toMatchObject({ stance: 'favorable', summary: null })
  })
})
