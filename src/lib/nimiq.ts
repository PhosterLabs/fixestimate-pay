import { init } from '@nimiq/mini-app-sdk'

export interface WalletConnection {
  address: string
  provider: Awaited<ReturnType<typeof init>>
}

let providerPromise: ReturnType<typeof init> | null = null

function getProvider() {
  providerPromise ??= init({ timeout: 10_000 })
  return providerPromise
}

function providerError(value: unknown): string | null {
  if (typeof value !== 'object' || value === null || !('error' in value)) return null
  const error = (value as { error?: { message?: unknown } }).error
  return typeof error?.message === 'string' ? error.message : 'Nimiq Pay could not complete the request.'
}

export async function connectWallet(): Promise<WalletConnection> {
  const provider = await getProvider()
  const accounts = await provider.listAccounts()
  const error = providerError(accounts)
  if (error) throw new Error(error)
  if (!Array.isArray(accounts) || typeof accounts[0] !== 'string') throw new Error('No Nimiq account is available.')
  return { address: accounts[0], provider }
}

export async function payForReport(connection: WalletConnection, recipient: string, value: number, requestId: string): Promise<string> {
  if (!recipient) throw new Error('Payments are not configured yet.')
  const result = await connection.provider.sendBasicTransactionWithData({
    recipient,
    value,
    data: `FixEstimate:${requestId.slice(0, 36)}`,
  })
  const error = providerError(result)
  if (error) throw new Error(error)
  if (typeof result !== 'string' || result.length < 8) throw new Error('Nimiq Pay did not return a transaction reference.')
  return result
}

export function friendlyWalletError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (/timed?\s*out|provider|inject/i.test(message)) return 'Open FixEstimate Pay inside Nimiq Pay to connect your wallet.'
  if (/denied|reject|cancel/i.test(message)) return 'Wallet request cancelled. No payment was made.'
  return message
}
