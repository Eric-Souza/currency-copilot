import { describe, expect, it, vi } from 'vitest'
import { convert, getLatestRate, getRateHistory } from '@/lib/frankfurter'
import { formatAmount } from '@/lib/format'

const fakeFetch = (body: unknown, init: ResponseInit = {}) =>
  vi.fn(async () => Response.json(body, init)) as unknown as typeof fetch & ReturnType<typeof vi.fn>

describe('getLatestRate', () => {
  it('returns the rate and its publication date', async () => {
    const fetchFn = fakeFetch({ amount: 1, base: 'USD', date: '2026-10-26', rates: { BRL: 5.5884 } })
    expect(await getLatestRate('usd', 'brl', fetchFn)).toEqual({ base: 'USD', quote: 'BRL', rate: 5.5884, date: '2026-10-26' })
    expect(fetchFn).toHaveBeenCalledWith('https://api.frankfurter.dev/v1/latest?base=USD&symbols=BRL', expect.anything())
  })

  it('answers 1 for the same currency', async () => {
    const fetchFn = fakeFetch({ amount: 1, base: 'EUR', date: '2026-10-26', rates: {} })
    expect((await getLatestRate('EUR', 'EUR', fetchFn)).rate).toBe(1)
  })

  it('explains unsupported currencies', async () => {
    const fetchFn = fakeFetch({ message: 'not found' }, { status: 404 })
    await expect(getLatestRate('USD', 'ARS', fetchFn)).rejects.toThrow(/USD\/ARS isn't available/)
  })

  it('turns a hung request into a readable error', async () => {
    const timeout = Object.assign(new Error('aborted'), { name: 'TimeoutError' })
    const fetchFn = vi.fn(async () => Promise.reject(timeout)) as unknown as typeof fetch
    await expect(getLatestRate('USD', 'BRL', fetchFn)).rejects.toThrow("Frankfurter didn't respond within 8 seconds")
  })

  it('reports other failures', async () => {
    const fetchFn = fakeFetch({}, { status: 503, statusText: 'Service Unavailable' })
    await expect(getLatestRate('USD', 'BRL', fetchFn)).rejects.toThrow('Frankfurter returned 503 Service Unavailable')
  })
})

describe('getRateHistory', () => {
  const series = {
    amount: 1,
    base: 'USD',
    start_date: '2026-09-25',
    end_date: '2026-10-26',
    rates: { '2026-10-26': { BRL: 5.5884 }, '2026-09-25': { BRL: 5.0 }, '2026-10-01': { BRL: 4.9 } },
  }

  it('returns sorted points and the summary the chart shows', async () => {
    const fetchFn = fakeFetch(series)
    const history = await getRateHistory('usd', 'brl', 30, fetchFn, new Date('2026-10-26T12:00:00Z'))
    expect(fetchFn).toHaveBeenCalledWith('https://api.frankfurter.dev/v1/2026-09-26..?base=USD&symbols=BRL', expect.anything())
    expect(history.points.map((p) => p.date)).toEqual(['2026-09-25', '2026-10-01', '2026-10-26'])
    expect(history).toMatchObject({ first: 5, last: 5.5884, min: 4.9, max: 5.5884, changePct: 11.77 })
  })

  it('has nothing to chart for the same currency', async () => {
    await expect(getRateHistory('EUR', 'eur', 30, fakeFetch(series))).rejects.toThrow(/always 1/)
  })
})

describe('convert', () => {
  it('converts into every currency with one request, in the order asked', async () => {
    const fetchFn = fakeFetch({ amount: 1, base: 'USD', date: '2026-10-26', rates: { BRL: 5.5884, JPY: 157.45 } })
    const result = await convert(500, 'usd', ['jpy', 'BRL', 'brl'], fetchFn)
    expect(fetchFn).toHaveBeenCalledWith('https://api.frankfurter.dev/v1/latest?base=USD&symbols=JPY,BRL', expect.anything())
    expect(result).toEqual({
      amount: 500,
      base: 'USD',
      date: '2026-10-26',
      rows: [
        { quote: 'JPY', rate: 157.45, value: 78_725 },
        { quote: 'BRL', rate: 5.5884, value: 2794.2 },
      ],
      unavailable: [],
    })
  })

  it('lists the currencies Frankfurter left out, and handles the base itself', async () => {
    const fetchFn = fakeFetch({ amount: 1, base: 'USD', date: '2026-10-26', rates: { BRL: 5.5884 } })
    const result = await convert(10, 'USD', ['BRL', 'ARS', 'USD'], fetchFn)
    expect(result.rows.map((r) => [r.quote, r.value])).toEqual([['BRL', 55.884], ['USD', 10]])
    expect(result.unavailable).toEqual(['ARS'])
  })

  it('explains when nothing could be converted', async () => {
    const fetchFn = fakeFetch({ message: 'not found' }, { status: 404 })
    await expect(convert(10, 'USD', ['ARS'], fetchFn)).rejects.toThrow(/USD\/ARS isn't available/)
  })
})

describe('formatAmount', () => {
  it("uses each currency's usual decimals", () => {
    expect(formatAmount(2794.2, 'BRL')).toBe('2,794.20')
    expect(formatAmount(78_725.4, 'JPY')).toBe('78,725')
  })
})
