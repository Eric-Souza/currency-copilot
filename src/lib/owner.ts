// Chats belong to an anonymous browser until there are accounts: a random id in an httpOnly
// cookie, so a chat URL alone doesn't open someone else's chat.

import { generateId } from 'ai'
import { cookies } from 'next/headers'

const OWNER_COOKIE = 'cc_owner'
const ONE_YEAR = 60 * 60 * 24 * 365

/** The browser's owner id, if it has one. Readable from pages. */
export async function readOwnerId() {
  return (await cookies()).get(OWNER_COOKIE)?.value
}

/** The browser's owner id, set on first use. Only from route handlers, which can set cookies. */
export async function ownerId() {
  const store = await cookies()
  const existing = store.get(OWNER_COOKIE)?.value
  if (existing) return existing
  const id = generateId()
  store.set(OWNER_COOKIE, id, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: ONE_YEAR, path: '/' })
  return id
}
