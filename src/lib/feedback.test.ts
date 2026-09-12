import { afterEach, describe, expect, it, vi } from 'vitest'
import { submitFeedback } from './feedback'
import type { EstimateResult } from '../types'

const estimate = { id: '768f9062-b59c-4b7a-b129-24341f7829e7', transactionHash: 'abc123456789' } as EstimateResult

afterEach(() => vi.restoreAllMocks())

describe('submitFeedback', () => {
  it('submits feedback with the verified report references', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ saved: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    await submitFeedback(estimate, { helpful: true }, '/api')
    expect(fetchMock).toHaveBeenCalledWith('/api/feedback', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ requestId: estimate.id, transactionHash: estimate.transactionHash, helpful: true }),
    }))
  })

  it('rejects feedback for a report without a payment reference', async () => {
    await expect(submitFeedback({ ...estimate, transactionHash: undefined }, { helpful: true }, '/api')).rejects.toThrow('paid reports')
  })
})
