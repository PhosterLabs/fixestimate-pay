import { afterEach, describe, expect, it, vi } from 'vitest'
import { verifyNimPayment } from './payment.js'

const expected = {
  transactionHash: 'abc123456789',
  recipient: 'NQ84 DJ2S B0TY DT21 QQDV P6AN ES3F ECUD UD85',
  sender: 'NQ11 TEST TEST TEST TEST TEST TEST TEST TEST',
  minimumValue: 10_000,
  requestId: '768f9062-b59c-4b7a-b129-24341f7829e7',
}

afterEach(() => vi.restoreAllMocks())

function mockTransaction(overrides: Record<string, unknown> = {}) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ result: {
    sender: expected.sender,
    recipient: expected.recipient,
    value: 10_000,
    data: `FixEstimate:${expected.requestId}`,
    blockNumber: 42,
    ...overrides,
  } }), { status: 200, headers: { 'Content-Type': 'application/json' } })))
}

describe('verifyNimPayment', () => {
  it('accepts a confirmed matching payment', async () => {
    mockTransaction()
    await expect(verifyNimPayment('https://rpc.example', expected)).resolves.toBeUndefined()
  })

  it('rejects a payment from another wallet', async () => {
    mockTransaction({ sender: 'NQ22 OTHER WALLET' })
    await expect(verifyNimPayment('https://rpc.example', expected)).rejects.toThrow('sender')
  })

  it('rejects an unconfirmed payment', async () => {
    mockTransaction({ blockNumber: 0 })
    await expect(verifyNimPayment('https://rpc.example', expected)).rejects.toThrow('waiting')
  })

  it('accepts the wrapped Nimiq Watch response and hex recipient data', async () => {
    const memo = Buffer.from(`FixEstimate:${expected.requestId}`, 'utf8').toString('hex')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ result: {
      data: {
        from: 'NQ83 CONTRACT WALLET',
        to: expected.recipient,
        value: 10_000,
        recipientData: memo,
        blockNumber: 42,
        relatedAddresses: [expected.sender, expected.recipient],
      },
      metadata: null,
    } }), { status: 200, headers: { 'Content-Type': 'application/json' } })))

    await expect(verifyNimPayment('https://rpc.example', expected)).resolves.toBeUndefined()
  })
})
