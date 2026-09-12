import { describe, expect, it } from 'vitest'
import { createDemoEstimate } from './estimate'

describe('createDemoEstimate', () => {
  it('creates a complete, non-authoritative sample report', () => {
    const result = createDemoEstimate({ requestId: 'test-id', category: 'plumbing', urgency: 'soon', description: 'Water is dripping below the kitchen sink.' })
    expect(result.id).toBe('test-id')
    expect(result.demo).toBe(true)
    expect(result.lowEstimate).toBeLessThan(result.highEstimate)
    expect(result.scopeItems.length).toBeGreaterThanOrEqual(4)
  })
})
