import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Chat, ChatShell } from '@/components/chat/chat'
import { getChatStore } from '@/lib/db'
import { CHAT_ID } from '@/lib/db/chat-store'
import { readOwnerId } from '@/lib/owner'

async function SavedChat({ params }: { params: PageProps<'/chat/[id]'>['params'] }) {
  const { id } = await params
  if (!CHAT_ID.test(id)) notFound()
  const owner = await readOwnerId()
  const store = getChatStore()
  // A browser without the owner cookie hasn't saved anything yet
  const messages = store && owner ? await store.load(id, owner) : []
  if (messages === null) notFound()
  const recent = store && owner ? await store.list(owner) : []
  return (
    <Chat
      id={id}
      initialMessages={messages}
      recent={recent.filter((c) => c.id !== id).map((c) => ({ id: c.id, title: c.title || 'Untitled chat' }))}
    />
  )
}

export default function Page(props: PageProps<'/chat/[id]'>) {
  return (
    <Suspense fallback={<ChatShell />}>
      <SavedChat params={props.params} />
    </Suspense>
  )
}
