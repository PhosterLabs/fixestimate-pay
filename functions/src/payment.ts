export interface PaymentExpectation {
  transactionHash: string
  recipient: string
  minimumValue: number
  requestId: string
  sender: string
}

interface JsonRpcResponse { result?: unknown; error?: { message?: string } }

const stringAt = (value: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) if (typeof value[key] === 'string') return value[key] as string
  return ''
}

const numberAt = (value: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const candidate = value[key]
    if (typeof candidate === 'number' && Number.isFinite(candidate)) return candidate
    if (typeof candidate === 'string' && /^\d+$/.test(candidate)) return Number(candidate)
  }
  return 0
}

function normalizeTransaction(raw: unknown) {
  if (!raw || typeof raw !== 'object') throw new Error('Payment has not been confirmed yet.')
  const outer = raw as Record<string, unknown>
  const dataEnvelope = outer.data && typeof outer.data === 'object' ? outer.data as Record<string, unknown> : {}
  const transactionEnvelope = outer.transaction && typeof outer.transaction === 'object' ? outer.transaction as Record<string, unknown> : {}
  const transaction = { ...outer, ...dataEnvelope, ...transactionEnvelope }
  const encodedData = stringAt(transaction, ['recipientData'])
  const relatedAddresses = Array.isArray(transaction.relatedAddresses)
    ? transaction.relatedAddresses.filter((value): value is string => typeof value === 'string')
    : []
  return {
    sender: stringAt(transaction, ['sender', 'from', 'senderAddress']),
    recipient: stringAt(transaction, ['recipient', 'to', 'recipientAddress']),
    value: numberAt(transaction, ['value', 'amount']),
    data: stringAt(transaction, ['data', 'message']) || (encodedData && /^[\da-f]+$/i.test(encodedData) ? Buffer.from(encodedData, 'hex').toString('utf8') : encodedData),
    blockNumber: numberAt(transaction, ['blockNumber', 'blockHeight']),
    relatedAddresses,
  }
}

export async function verifyNimPayment(rpcUrl: string, expected: PaymentExpectation): Promise<void> {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: expected.requestId, method: 'getTransactionByHash', params: [expected.transactionHash] }),
    signal: AbortSignal.timeout(8_000),
  })
  if (!response.ok) throw new Error('Payment verification service is unavailable.')
  const payload = await response.json() as JsonRpcResponse
  if (payload.error) throw new Error(payload.error.message || 'Payment could not be verified.')
  const transaction = normalizeTransaction(payload.result)
  if (!transaction.blockNumber) throw new Error('Payment is waiting for network confirmation.')
  if (transaction.recipient.replaceAll(' ', '') !== expected.recipient.replaceAll(' ', '')) throw new Error('Payment recipient does not match.')
  const expectedSender = expected.sender.replaceAll(' ', '')
  const senderMatches = transaction.sender.replaceAll(' ', '') === expectedSender
    || transaction.relatedAddresses.some((address) => address.replaceAll(' ', '') === expectedSender)
  if (!senderMatches) throw new Error('Payment sender does not match the connected wallet.')
  if (transaction.value < expected.minimumValue) throw new Error('Payment amount is below the report price.')
  if (transaction.data !== `FixEstimate:${expected.requestId.slice(0, 36)}`) throw new Error('Payment reference does not match this estimate.')
}
