import { APICallError, LoadAPIKeyError, RetryError } from 'ai'
import { describe, expect, it, vi } from 'vitest'
import { chatErrorMessage } from '@/lib/errors'
import { FrankfurterError } from '@/lib/frankfurter'
import { modelConfig } from '@/lib/model'

describe('modelConfig', () => {
  it('defaults to Gemini, and AI_MODEL overrides the model', () => {
    expect(modelConfig({})).toEqual({ provider: 'google', modelId: 'gemini-3.6-flash' })
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
