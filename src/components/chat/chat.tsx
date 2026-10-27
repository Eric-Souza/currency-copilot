'use client'

import { useChat } from '@ai-sdk/react'
import { useEffect, useRef, useState } from 'react'
import { ConversionTable, ConversionTableSkeleton } from '@/components/tool-ui/conversion-table'
import { RateCard, RateCardSkeleton } from '@/components/tool-ui/rate-card'
import { RateHistoryChart, RateHistorySkeleton } from '@/components/tool-ui/rate-history-chart'
import type { ChatMessage } from '@/lib/tools'

const SUGGESTIONS = [
  'What is the dollar worth in reais today?',
  'How has USD/BRL moved this month?',
  'EUR to GBP over the last 3 months',
  'How much is 500 dollars in reais, euros and yen?',
]

function ToolError({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
      {text}
    </div>
  )
}

function MessageParts({ message }: { message: ChatMessage }) {
  return message.parts.map((part, i) => {
    switch (part.type) {
      case 'text':
        return (
          <p key={i} className="whitespace-pre-wrap leading-relaxed">
            {part.text}
          </p>
        )
      case 'tool-getRate':
        switch (part.state) {
          case 'output-available':
            return <RateCard key={i} {...part.output} />
          case 'output-error':
            return <ToolError key={i} text={part.errorText} />
          case 'output-denied':
            return null
          default:
            return <RateCardSkeleton key={i} />
        }
      case 'tool-getRateHistory':
        switch (part.state) {
          case 'output-available':
            return <RateHistoryChart key={i} {...part.output} />
          case 'output-error':
            return <ToolError key={i} text={part.errorText} />
          case 'output-denied':
            return null
          default:
            return <RateHistorySkeleton key={i} />
        }
      case 'tool-convert':
        switch (part.state) {
          case 'output-available':
            return <ConversionTable key={i} {...part.output} />
          case 'output-error':
            return <ToolError key={i} text={part.errorText} />
          case 'output-denied':
            return null
          default:
            return <ConversionTableSkeleton key={i} />
        }
      default:
        return null
    }
  })
}

export function Chat() {
  // A fixed id until chats are saved (Neon). Without one, useChat generates a random id while
  // rendering, which Cache Components rejects during the prerender
  const { messages, sendMessage, status, error, regenerate } = useChat<ChatMessage>({ id: 'chat' })
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const busy = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, status])

  function send(text: string) {
    if (!text.trim() || busy) return
    sendMessage({ text })
    setInput('')
  }

  return (
    <div className="mx-auto flex h-dvh w-full max-w-2xl flex-col px-4">
      <header className="py-6">
        <h1 className="text-xl font-semibold">Currency Copilot</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Exchange rates from the European Central Bank, explained.
        </p>
      </header>

      <main className="flex-1 space-y-6 overflow-y-auto pb-6">
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-full border border-black/10 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-white/15 dark:hover:bg-zinc-800"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={message.role === 'user' ? 'flex justify-end' : 'flex flex-col items-start gap-3'}
          >
            {message.role === 'user' ? (
              <div className="max-w-[80%] rounded-2xl bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900">
                {message.parts.map((p, i) => (p.type === 'text' ? <span key={i}>{p.text}</span> : null))}
              </div>
            ) : (
              <MessageParts message={message} />
            )}
          </div>
        ))}

        {status === 'submitted' && <div className="text-sm text-zinc-400">Thinking…</div>}

        {error && (
          <div className="flex items-center gap-3">
            <ToolError text={error.message || 'Something went wrong.'} />
            <button onClick={() => regenerate()} className="text-sm underline">
              Retry
            </button>
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
        className="flex gap-2 border-t border-black/10 py-4 dark:border-white/10"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about a currency…"
          aria-label="Message"
          className="flex-1 rounded-xl border border-black/10 bg-transparent px-4 py-2 outline-none focus:border-zinc-400 dark:border-white/15"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-xl bg-zinc-900 px-4 py-2 text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Send
        </button>
      </form>
    </div>
  )
}
