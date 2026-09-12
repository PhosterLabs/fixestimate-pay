import { describe, expect, it } from 'vitest'
import { friendlyWalletError } from './nimiq'

describe('friendlyWalletError', () => {
  it('treats cancellation as a normal outcome', () => expect(friendlyWalletError(new Error('Permission denied by user'))).toContain('cancelled'))
  it('explains the host requirement', () => expect(friendlyWalletError(new Error('Provider timed out'))).toContain('inside Nimiq Pay'))
})
