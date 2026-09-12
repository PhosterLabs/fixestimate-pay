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

  it('keeps gas reports professional-only', () => {
    const result = createDemoEstimate({ requestId: 'gas-test', category: 'gas', urgency: 'urgent', description: 'There is an unusual odor near the gas furnace.' })
    expect(result.professionalRequired).toBe(true)
    expect(result.difficulty).toBe('professional-only')
    expect(result.repairSteps.join(' ')).toContain('licensed professional')
  })
})
