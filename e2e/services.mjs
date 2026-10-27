// What the app talks to during the end-to-end tests, with nothing real behind it:
// Postgres (PGlite over the wire protocol, migrated like Neon) and a fake Frankfurter.

import { createServer } from 'node:http'
import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'

export const DB_PORT = 5439
export const RATES_PORT = 8799

const DATE = '2026-10-26'
const USD = { BRL: 5.5884, EUR: 0.8938, GBP: 0.7721, JPY: 157.45 }

const db = new PGlite()
await migrate(drizzle({ client: db }), { migrationsFolder: './drizzle' })
// The app's pool opens several connections; PGlite runs their queries one at a time
await new PGLiteSocketServer({ db, port: DB_PORT, host: '127.0.0.1', maxConnections: 10 }).start()

// Only what the tools ask for, with USD as the base: /latest and /<start>..
function rates(url) {
  const symbols = url.searchParams.get('symbols')?.split(',') ?? Object.keys(USD)
  return Object.fromEntries(symbols.filter((s) => s in USD).map((s) => [s, USD[s]]))
}

createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const send = (status, body) => res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(body))
  if (url.pathname === '/health') return send(200, { ok: true })
  if (url.searchParams.get('base') !== 'USD') return send(404, { message: 'not found' })
  const latest = rates(url)
  if (Object.keys(latest).length === 0) return send(404, { message: 'not found' })
  if (url.pathname === '/v1/latest') return send(200, { amount: 1, base: 'USD', date: DATE, rates: latest })
  const range = url.pathname.match(/^\/v1\/(\d{4}-\d{2}-\d{2})\.\.$/)
  if (!range) return send(404, { message: 'not found' })
  // 30 working days drifting up to the latest rate
  const series = {}
  for (let i = 29; i >= 0; i--) {
    const day = new Date(Date.parse(DATE) - i * 86_400_000).toISOString().slice(0, 10)
    series[day] = Object.fromEntries(Object.entries(latest).map(([s, r]) => [s, Math.round(r * (1 - i * 0.001) * 1e4) / 1e4]))
  }
  send(200, { amount: 1, base: 'USD', start_date: range[1], end_date: DATE, rates: series })
}).listen(RATES_PORT, '127.0.0.1')

console.log(`Postgres on ${DB_PORT}, Frankfurter on ${RATES_PORT}`)
