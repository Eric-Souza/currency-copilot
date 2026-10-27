import { asc, desc, eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { ChatMessage } from '../tools'
import * as schema from './schema'

export type Db = NodePgDatabase<typeof schema>

/** Chat ids come from the URL, so only short opaque tokens are accepted */
export const CHAT_ID = /^[A-Za-z0-9_-]{8,64}$/

const TITLE_LENGTH = 80

function titleOf(messages: ChatMessage[]) {
  const first = messages.find((m) => m.role === 'user')
  const text = first?.parts.map((p) => (p.type === 'text' ? p.text : '')).join(' ').trim() ?? ''
  return text.length > TITLE_LENGTH ? `${text.slice(0, TITLE_LENGTH - 1)}…` : text
}

export function createChatStore(db: Db) {
  return {
    /** The chat's messages, [] for a chat that doesn't exist yet, or null if another browser owns it */
    async load(chatId: string, ownerId: string): Promise<ChatMessage[] | null> {
      const [chat] = await db.select({ ownerId: schema.chats.ownerId }).from(schema.chats).where(eq(schema.chats.id, chatId))
      if (!chat) return []
      if (chat.ownerId !== ownerId) return null
      const rows = await db
        .select({ id: schema.messages.id, role: schema.messages.role, parts: schema.messages.parts })
        .from(schema.messages)
        .where(eq(schema.messages.chatId, chatId))
        .orderBy(asc(schema.messages.position))
      return rows as ChatMessage[]
    },

    /** Replaces the chat's messages with `messages`, the whole conversation after a response */
    async save(chatId: string, ownerId: string, messages: ChatMessage[]) {
      await db.transaction(async (tx) => {
        const [chat] = await tx
          .insert(schema.chats)
          .values({ id: chatId, ownerId, title: titleOf(messages) })
          .onConflictDoUpdate({
            target: schema.chats.id,
            set: { updatedAt: new Date() },
            setWhere: eq(schema.chats.ownerId, ownerId),
          })
          .returning({ id: schema.chats.id })
        if (!chat) throw new Error(`Chat ${chatId} belongs to another browser`)
        // Regenerating replaces the last answer, so rewrite the list rather than append to it
        await tx.delete(schema.messages).where(eq(schema.messages.chatId, chatId))
        if (messages.length > 0) {
          await tx.insert(schema.messages).values(
            messages.map((m, position) => ({ chatId, id: m.id, position, role: m.role, parts: m.parts })),
          )
        }
      })
    },

    /** The browser's most recent chats, newest first */
    async list(ownerId: string, limit = 20) {
      return db
        .select({ id: schema.chats.id, title: schema.chats.title, updatedAt: schema.chats.updatedAt })
        .from(schema.chats)
        .where(eq(schema.chats.ownerId, ownerId))
        .orderBy(desc(schema.chats.updatedAt))
        .limit(limit)
    },
  }
}

export type ChatStore = ReturnType<typeof createChatStore>
