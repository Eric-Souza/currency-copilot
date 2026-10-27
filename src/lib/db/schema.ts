import { index, integer, jsonb, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core'

export const chats = pgTable(
  'chats',
  {
    id: text('id').primaryKey(),
    /** The anonymous browser that owns the chat (the owner cookie), until there are accounts */
    ownerId: text('owner_id').notNull(),
    title: text('title').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('chats_owner_updated_idx').on(t.ownerId, t.updatedAt)],
)

/** One row per UIMessage, stored as useChat sends it so tool results render again on reload */
export const messages = pgTable(
  'messages',
  {
    chatId: text('chat_id')
      .notNull()
      .references(() => chats.id, { onDelete: 'cascade' }),
    id: text('id').notNull(),
    position: integer('position').notNull(),
    role: text('role').notNull(),
    parts: jsonb('parts').notNull(),
  },
  (t) => [primaryKey({ columns: [t.chatId, t.id] })],
)
