import { describe, expect, it, vi } from 'vitest'
import { getLatestRate } from '@/lib/frankfurter'

const fakeFetch = (body: unknown, init: ResponseInit = {}) =>
  vi.fn(async () => Response.json(body, init)) as unknown as typeof fetch & ReturnType<typeof vi.fn>

describe('getLatestRate', () => {
  it('returns the rate and its publication date', async () => {
    const fetchFn = fakeFetch({ amount: 1, base: 'USD', date: '2026-10-26', rates: { BRL: 5.5884 } })
    expect(await getLatestRate('usd', 'brl', fetchFn)).toEqual({ base: 'USD', quote: 'BRL', rate: 5.5884, date: '2026-10-26' })
    expect(fetchFn).toHaveBeenCalledWith('https://api.frankfurter.dev/v1/latest?base=USD&symbols=BRL')
  })

  it('answers 1 for the same currency', async () => {
    const fetchFn = fakeFetch({ amount: 1, base: 'EUR', date: '2026-10-26', rates: {} })
    expect((await getLatestRate('EUR', 'EUR', fetchFn)).rate).toBe(1)
  })

  it('explains unsupported currencies', async () => {
    const fetchFn = fakeFetch({ message: 'not found' }, { status: 404 })
    await expect(getLatestRate('USD', 'ARS', fetchFn)).rejects.toThrow(/USD\/ARS isn't available/)
  })

  it('reports other failures', async () => {
    const fetchFn = fakeFetch({}, { status: 503, statusText: 'Service Unavailable' })
    await expect(getLatestRate('USD', 'BRL', fetchFn)).rejects.toThrow('Frankfurter returned 503 Service Unavailable')
  })
})
