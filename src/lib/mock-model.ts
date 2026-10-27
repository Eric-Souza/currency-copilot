// A scripted model for the end-to-end tests (AI_PROVIDER=mock): it picks a tool from keywords in
// the question, then answers in one sentence. The tools still run for real, against whatever
// FRANKFURTER_URL points at.

import { simulateReadableStream } from 'ai'
import { MockLanguageModelV3 } from 'ai/test'

type Prompt = Parameters<MockLanguageModelV3['doStream']>[0]['prompt']

const usage = {
  inputTokens: { total: 0, noCache: 0, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 0, text: 0, reasoning: undefined },
}

function lastUserText(prompt: Prompt) {
  const message = prompt.findLast((m) => m.role === 'user')
  return message?.content.map((p) => (p.type === 'text' ? p.text : '')).join(' ') ?? ''
}

function toolCall(question: string): { toolName: string; input: object } | null {
  const amount = question.match(/(\d+(?:\.\d+)?) dollars? in reais/i)
  if (amount) return { toolName: 'convert', input: { amount: Number(amount[1]), base: 'USD', quotes: ['BRL'] } }
  if (/moved/i.test(question)) return { toolName: 'getRateHistory', input: { base: 'USD', quote: 'BRL', days: 30 } }
  if (/rate/i.test(question)) return { toolName: 'getRate', input: { base: 'USD', quote: 'BRL' } }
  return null
}

function chunks(prompt: Prompt) {
  const answered = prompt.at(-1)?.role === 'tool'
  const call = answered ? null : toolCall(lastUserText(prompt))
  if (call) {
    return [
      { type: 'tool-call', toolCallId: 'call-1', toolName: call.toolName, input: JSON.stringify(call.input) },
      { type: 'finish', finishReason: { unified: 'tool-calls', raw: undefined }, usage },
    ] as const
  }
  const text = answered ? 'Those are the ECB reference rates from Monday.' : 'Ask me about a currency pair.'
  return [
    { type: 'text-start', id: 't1' },
    { type: 'text-delta', id: 't1', delta: text },
    { type: 'text-end', id: 't1' },
    { type: 'finish', finishReason: { unified: 'stop', raw: undefined }, usage },
  ] as const
}

export function mockModel() {
  return new MockLanguageModelV3({
    doStream: async ({ prompt }) => ({
      stream: simulateReadableStream({ chunks: [...chunks(prompt)], chunkDelayInMs: 20 }),
    }),
  })
}
