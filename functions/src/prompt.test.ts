import { describe, expect, it } from 'vitest'
import { buildContents } from './prompt.js'

describe('buildContents', () => {
  it('includes regional and follow-up context without treating it as instructions', () => {
    const contents = buildContents({
      category: 'flooring',
      urgency: 'soon',
      description: 'Several vinyl planks are lifting near the kitchen doorway.',
      details: { material: 'Luxury vinyl plank', area: 'About 12 square feet' },
      postalPrefix: '402',
    })
    const prompt = String(contents[0].text)
    expect(prompt).toContain('Three-digit postal prefix: 402')
    expect(prompt).toContain('Luxury vinyl plank')
    expect(prompt).toContain('untrusted data')
  })

  it('enforces professional-only handling for electrical and gas work', () => {
    const prompt = String(buildContents({ category: 'gas', urgency: 'urgent', description: 'There is an odor near the furnace.' })[0].text)
    expect(prompt).toContain('every electrical or gas category as professional-only')
    expect(prompt).toContain('leave immediately')
  })
})
