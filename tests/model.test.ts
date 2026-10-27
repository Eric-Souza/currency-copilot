import { APICallError, LoadAPIKeyError, RetryError, type UIMessageChunk } from 'ai'
import { describe, expect, it, vi } from 'vitest'
import { chatErrorMessage, reportTimeouts, TIMEOUT_MESSAGE } from '@/lib/errors'
import { FrankfurterError } from '@/lib/frankfurter'
import { modelConfig } from '@/lib/model'

describe('modelConfig', () => {
  it('defaults to Gemini, and AI_MODEL overrides the model', () => {
    expect(modelConfig({})).toEqual({ provider: 'google', modelId: 'gemini-3.5-flash-lite' })
    expect(modelConfig({ AI_PROVIDER: 'Groq' })).toEqual({ provider: 'groq', modelId: 'openai/gpt-oss-120b' })
    expect(modelConfig({ AI_PROVIDER: 'groq', AI_MODEL: 'llama-3.3-70b-versatile' }).modelId).toBe('llama-3.3-70b-versatile')
  })

  it('rejects an unknown provider', () => {
    expect(() => modelConfig({ AI_PROVIDER: 'openai' })).toThrow(/google, groq/)
  })
})

describe('chatErrorMessage', () => {
  it('passes setup and rate-limit errors through, and hides the rest', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(chatErrorMessage(new LoadAPIKeyError({ message: 'API key is missing.' }))).toBe('API key is missing. See .env.example.')
    const limited = new APICallError({ message: 'quota', url: 'x', requestBodyValues: {}, statusCode: 429 })
    expect(chatErrorMessage(limited)).toMatch(/rate limit/)
    const busy = new APICallError({ message: 'high demand', url: 'x', requestBodyValues: {}, statusCode: 503 })
    const retried = new RetryError({ message: 'Failed after 3 attempts', reason: 'maxRetriesExceeded', errors: [busy, busy] })
    expect(chatErrorMessage(retried)).toMatch(/overloaded/)
    expect(chatErrorMessage(new FrankfurterError('USD/ARS is not available.'))).toBe('USD/ARS is not available.')
    expect(chatErrorMessage(new Error('secret internals'))).toBe('Something went wrong. Try again.')
  })
})

describe('chatErrorMessage quotas', () => {
  it('says when the daily free quota, not the per-minute limit, is used up', () => {
    const daily = new APICallError({
      message: 'You exceeded your current quota',
      url: 'x',
      requestBodyValues: {},
      statusCode: 429,
      responseBody: '{"quotaId":"GenerateRequestsPerDayPerProjectPerModel-FreeTier"}',
    })
    expect(chatErrorMessage(daily)).toMatch(/daily quota is used up/)
  })
})

describe('reportTimeouts', () => {
  const read = async (stream: ReadableStream<UIMessageChunk>) => {
    const chunks: UIMessageChunk[] = []
    const reader = stream.getReader()
    for (let r = await reader.read(); !r.done; r = await reader.read()) chunks.push(r.value)
    return chunks
  }
  const aborted = () =>
    new ReadableStream<UIMessageChunk>({
      start(controller) {
        controller.enqueue({ type: 'start' })
        controller.enqueue({ type: 'abort', reason: 'The operation was aborted due to timeout' })
        controller.close()
      },
    })

  it('turns a timeout into an error the chat shows', async () => {
    expect(await read(reportTimeouts(aborted(), new AbortController().signal))).toEqual([
      { type: 'start' },
      { type: 'error', errorText: TIMEOUT_MESSAGE },
    ])
  })

  it('leaves a real disconnect as an abort', async () => {
    const gone = new AbortController()
    gone.abort()
    expect((await read(reportTimeouts(aborted(), gone.signal)))[1].type).toBe('abort')
  })
})
