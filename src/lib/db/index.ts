// Neon Postgres over node-postgres, with the pool handed to Vercel so idle connections close
// before a function instance is suspended. Without DATABASE_URL the app runs, unsaved.

import { attachDatabasePool } from '@vercel/functions'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { type ChatStore, createChatStore } from './chat-store'
import * as schema from './schema'

let store: ChatStore | undefined

export function getChatStore(): ChatStore | null {
  if (!process.env.DATABASE_URL) return null
  if (!store) {
    // The pooled (-pooler) URL: Neon's PgBouncer handles many short-lived functions
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 })
    attachDatabasePool(pool)
    store = createChatStore(drizzle(pool, { schema }))
  }
  return store
}
