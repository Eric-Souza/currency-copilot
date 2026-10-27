// The chat store against PGlite (Postgres in WASM), migrated with the same files as Neon.

import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { CHAT_ID, createChatStore, type ChatStore, type Db } from '@/lib/db/chat-store'
import * as schema from '@/lib/db/schema'
import type { ChatMessage } from '@/lib/tools'

const user = (id: string, text: string): ChatMessage => ({ id, role: 'user', parts: [{ type: 'text', text }] })
const reply = (id: string, text: string): ChatMessage => ({ id, role: 'assistant', parts: [{ type: 'text', text }] })

let client: PGlite
let store: ChatStore

beforeAll(async () => {
  client = new PGlite()
  const db = drizzle({ client, schema })
  await migrate(db, { migrationsFolder: './drizzle' })
  // Same query builder, different driver
  store = createChatStore(db as unknown as Db)
})
afterAll(() => client.close())

describe('chat store', () => {
  it('treats an unknown chat as new', async () => {
    expect(await store.load('newchat01', 'alice')).toEqual([])
  })

  it('saves a conversation and loads it back in order, titled by the first question', async () => {
    const messages = [user('u1', 'How much is 100 USD in BRL?'), reply('a1', 'About 558 reais.')]
    await store.save('chat0001', 'alice', messages)
    expect(await store.load('chat0001', 'alice')).toEqual(messages)
    expect((await store.list('alice')).map((c) => c.title)).toEqual(['How much is 100 USD in BRL?'])
  })

  it('replaces the messages on the next save, so a regenerated answer overwrites the old one', async () => {
    const messages = [user('u1', 'How much is 100 USD in BRL?'), reply('a2', 'About 559 reais.'), user('u2', 'And in EUR?')]
    await store.save('chat0001', 'alice', messages)
    expect(await store.load('chat0001', 'alice')).toEqual(messages)
  })

  it("keeps one browser out of another's chat", async () => {
    expect(await store.load('chat0001', 'mallory')).toBeNull()
    await expect(store.save('chat0001', 'mallory', [user('m1', 'hi')])).rejects.toThrow(/another browser/)
    expect(await store.load('chat0001', 'alice')).toHaveLength(3)
    expect(await store.list('mallory')).toEqual([])
  })

  it('lists the most recently updated chats first', async () => {
    await store.save('chat0002', 'alice', [user('u1', 'x'.repeat(100))])
    const chats = await store.list('alice')
    expect(chats.map((c) => c.id)).toEqual(['chat0002', 'chat0001'])
    expect(chats[0].title).toHaveLength(80)
    expect(chats[0].title.endsWith('…')).toBe(true)
  })

  it('accepts only short opaque chat ids', () => {
    expect(CHAT_ID.test('aB3_x-9kQ2')).toBe(true)
    expect(CHAT_ID.test('short')).toBe(false)
    expect(CHAT_ID.test('../etc/passwd')).toBe(false)
  })
})
