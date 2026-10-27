// The chat route end to end with a scripted model: it calls getRate, gets Frankfurter's rate
// (faked), and then answers. No API key or network needed.

import { simulateReadableStream } from 'ai'
import { MockLanguageModelV3 } from 'ai/test'
import { afterEach, describe, expect, it, vi } from 'vitest'

const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 5, text: 5, reasoning: undefined },
}

function scripted(...steps: unknown[][]) {
  let call = 0
  return new MockLanguageModelV3({
    doStream: async () => ({ stream: simulateReadableStream({ chunks: steps[call++] as never[] }) }),
  })
}

const model = vi.hoisted(() => ({ current: undefined as unknown }))
vi.mock('@/lib/model', () => ({ getModel: () => model.current }))

const { POST } = await import('@/app/api/chat/route')

function chatRequest(text: string) {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    body: JSON.stringify({ messages: [{ id: 'u1', role: 'user', parts: [{ type: 'text', text }] }] }),
  })
}

afterEach(() => vi.unstubAllGlobals())

describe('POST /api/chat', () => {
  it('runs getRate and streams its result, then the answer', async () => {
    vi.stubGlobal('fetch', async () => Response.json({ amount: 1, base: 'USD', date: '2026-10-26', rates: { BRL: 5.5884 } }))
    const mock = scripted(
      [
        { type: 'tool-call', toolCallId: 'call-1', toolName: 'getRate', input: '{"base":"usd","quote":"brl"}' },
        { type: 'finish', finishReason: { unified: 'tool-calls', raw: undefined }, usage },
      ],
      [
        { type: 'text-start', id: 't1' },
        { type: 'text-delta', id: 't1', delta: 'That is the ECB rate from Monday.' },
        { type: 'text-end', id: 't1' },
        { type: 'finish', finishReason: { unified: 'stop', raw: undefined }, usage },
      ],
    )
    model.current = mock

    const body = await (await POST(chatRequest('USD to BRL?'))).text()
    expect(body).toContain('"type":"tool-output-available"')
    expect(body).toContain('"output":{"base":"USD","quote":"BRL","rate":5.5884,"date":"2026-10-26"}')
    expect(body).toContain('That is the ECB rate from Monday.')
    // The second step saw the tool result
    expect(JSON.stringify(mock.doStreamCalls[1].prompt)).toContain('5.5884')
  })

  it('turns a tool failure into a tool error the UI can show', async () => {
    vi.stubGlobal('fetch', async () => Response.json({ message: 'not found' }, { status: 404 }))
    model.current = scripted(
      [
        { type: 'tool-call', toolCallId: 'call-1', toolName: 'getRate', input: '{"base":"USD","quote":"ARS"}' },
        { type: 'finish', finishReason: { unified: 'tool-calls', raw: undefined }, usage },
      ],
      [{ type: 'finish', finishReason: { unified: 'stop', raw: undefined }, usage }],
    )
    const body = await (await POST(chatRequest('USD to ARS?'))).text()
    expect(body).toContain('"type":"tool-output-error"')
    expect(body).toContain("USD/ARS isn't available")
  })
})
